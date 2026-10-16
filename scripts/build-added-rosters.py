#!/usr/bin/env python3
"""Build the added recruiting rosters from the NPPES dissemination CSV.

Writes California, Texas, and Florida files for every profession that is not
already stored from a board file or the original nursing and therapy rosters.
Each clinician is assigned by the longest matching taxonomy prefix. A leading
credential is removed when the rest of the license is a number.
"""

import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Longer prefixes are listed first only for readability. Matching uses length.
PROFESSIONS = [
    ("np", ["363L"], "Nurse Practitioner", ["NP"]),
    ("pa", ["363A"], "Physician Assistant", ["PA"]),
    ("cns", ["364S"], "Clinical Nurse Specialist", ["CNS"]),
    ("crna", ["3675"], "Nurse Anesthetist", ["CRNA"]),
    ("cnm", ["367A"], "Nurse Midwife", ["CNM"]),
    ("slp", ["235Z"], "Speech-Language Pathologist", ["SLP"]),
    ("aud", ["231H"], "Audiologist", ["AUD"]),
    ("rt", ["2278", "2279"], "Respiratory Therapist", ["RRT", "CRT"]),
    ("kt", ["2263"], "Kinesiotherapist", ["KT"]),
    ("csw", ["1041C"], "Clinical Social Worker", ["LCSW", "LMSW", "CSW"]),
    ("ssw", ["1041S"], "School Social Worker", ["SSW"]),
    ("sw", ["1041"], "Social Worker", ["LCSW", "LMSW", "LSW"]),
    ("pca", ["3747P1801X"], "Personal Care Attendant", ["PCA"]),
    ("ac", ["3747A0650X"], "Attendant Care Provider", []),
    ("hha", ["374U"], "Home Health Aide", ["HHA"]),
    ("cna", ["376K"], "Nurse Aide", ["CNA"]),
    ("comp", ["3726"], "Adult Companion", []),
    ("hm", ["376J"], "Homemaker", []),
    ("hab", ["373H"], "Day Training and Habilitation", []),
    ("st", ["247200000X"], "Surgical Technologist", ["CST"]),
    ("rad", ["2471"], "Radiologic Technologist", []),
    ("cvt", ["246W"], "Cardiovascular Technologist", ["CVT"]),
    ("mlt", ["246Q"], "Lab Technician", ["MLT"]),
    ("ht", ["246R"], "Health Technician", []),
    ("hit", ["246Y"], "Health Information Technician", ["HIT"]),
    ("aa", ["367H"], "Anesthesiologist Assistant", []),
]

STATES = {"CA": "California", "TX": "Texas", "FL": "Florida"}


def clean_license(prefixes: list[str], value: str) -> str:
    text = (value or "").strip()
    for prefix in prefixes:
        match = re.match(
            rf"^(?:CA[\s\-:#]*)?{prefix}[\s\-:#]*(.+)$",
            text,
            flags=re.IGNORECASE,
        )
        if not match:
            continue
        rest = match.group(1).strip()
        if re.fullmatch(r"[\d.\- ]+", rest):
            return rest
    return text


def title_word(word: str) -> str:
    return re.sub(
        r"(^|[-'])([a-z])",
        lambda match: match.group(1) + match.group(2).upper(),
        (word or "").lower(),
    )


def display_name(row: list[str], idx: dict[str, int]) -> str:
    parts = [
        row[idx["Provider First Name"]].strip(),
        row[idx["Provider Middle Name"]].strip(),
        row[idx["Provider Last Name (Legal Name)"]].strip(),
    ]
    return " ".join(title_word(part) for part in parts if part)


def phone_number(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) == 10:
        return f"{digits[0:3]}-{digits[3:6]}-{digits[6:]}"
    return (value or "").strip()


def primary_code(row: list[str], slots: list[tuple[int, int]]) -> str:
    first = ""
    for code_i, switch_i in slots:
        code = row[code_i].strip().upper()
        if not code:
            continue
        if not first:
            first = code
        if row[switch_i].strip().upper() == "Y":
            return code
    return first


def profession_for(code: str):
    best = None
    best_len = -1
    for profession in PROFESSIONS:
        for prefix in profession[1]:
            if code.startswith(prefix) and len(prefix) > best_len:
                best = profession
                best_len = len(prefix)
    return best


def pick_license(row: list[str], slots: list[tuple[int, int, int]], state: str) -> str:
    fallback = ""
    state_match = ""
    primary = ""
    for license_i, state_i, switch_i in slots:
        license_number = row[license_i].strip()
        if not license_number:
            continue
        if not fallback:
            fallback = license_number
        if row[state_i].strip().upper() == state:
            if not state_match:
                state_match = license_number
            if row[switch_i].strip().upper() == "Y":
                primary = license_number
    return primary or state_match or fallback


def main() -> None:
    csv.field_size_limit(sys.maxsize)
    if len(sys.argv) != 3 or sys.argv[1] != "--csv":
        raise SystemExit("Usage: python3 scripts/build-added-rosters.py --csv <npidata_pfile.csv>")
    csv_path = Path(sys.argv[2])
    out_dir = ROOT / "data"
    contactable: dict[tuple[str, str], list] = {
        (state, profession[0]): [] for state in STATES for profession in PROFESSIONS
    }
    totals = {key: 0 for key in contactable}

    with csv_path.open(newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        index = {name: position for position, name in enumerate(header)}
        tax_slots = [
            (
                index[f"Healthcare Provider Taxonomy Code_{slot}"],
                index[f"Healthcare Provider Primary Taxonomy Switch_{slot}"],
            )
            for slot in range(1, 16)
        ]
        license_slots = [
            (
                index[f"Provider License Number_{slot}"],
                index[f"Provider License Number State Code_{slot}"],
                index[f"Healthcare Provider Primary Taxonomy Switch_{slot}"],
            )
            for slot in range(1, 16)
        ]
        state_i = index["Provider Business Practice Location Address State Name"]
        entity_i = index["Entity Type Code"]
        seen = 0
        for row in reader:
            seen += 1
            if seen % 1_000_000 == 0:
                print(f"scanned {seen:,}", flush=True)
            if row[entity_i].strip() != "1":
                continue
            state = row[state_i].strip().upper()
            if state not in STATES:
                continue
            profession = profession_for(primary_code(row, tax_slots))
            if profession is None:
                continue
            key = (state, profession[0])
            totals[key] += 1
            phone = phone_number(
                row[index["Provider Business Practice Location Address Telephone Number"]]
            )
            if not phone:
                continue
            city = row[index["Provider Business Practice Location Address City Name"]].strip()
            zip_code = re.sub(
                r"\D",
                "",
                row[index["Provider Business Practice Location Address Postal Code"]],
            )[:5]
            address = row[
                index["Provider First Line Business Practice Location Address"]
            ].strip()
            code = primary_code(row, tax_slots)
            contactable[key].append(
                {
                    "licenseNumber": clean_license(
                        profession[3], pick_license(row, license_slots, state)
                    ),
                    "npi": row[index["NPI"]].strip(),
                    "displayName": display_name(row, index),
                    "credential": row[index["Provider Credential Text"]].strip()
                    or profession[0].upper(),
                    "licenseStatus": "NPPES",
                    "licenseType": profession[2],
                    "expirationDate": "",
                    "boardCity": city,
                    "boardCounty": "",
                    "boardState": state,
                    "boardZip": zip_code,
                    "practiceAddress": address or None,
                    "practiceCity": city or None,
                    "practiceState": state,
                    "practiceZip": zip_code or None,
                    "phone": phone,
                    "email": None,
                    "taxonomyCode": code,
                    "taxonomyDesc": profession[2],
                    "matchConfidence": "high",
                    "matchMethod": "nppes-taxonomy",
                    "source": {
                        "board": f"CMS NPPES NPI Registry ({STATES[state]})",
                        "enrichment": "CMS NPPES NPI Registry",
                    },
                    "labels": {
                        "boardActive": False,
                        "nppesEnumerated": True,
                        "contactPublic": True,
                    },
                }
            )
    print(f"scanned {seen:,}", flush=True)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for state, state_name in STATES.items():
        for key, _prefixes, license_type, _clean in PROFESSIONS:
            bucket = contactable[(state, key)]
            total = totals[(state, key)]
            path = out_dir / f"{state.lower()}-{key}-roster.json"
            roster = {
                "generatedAt": generated_at,
                "profession": key,
                "product": f"{state} {license_type} NPPES roster",
                "disclaimer": (
                    f"NPPES public practice listings for {state_name}. This is not a "
                    "state board license-status file, so rows are enumerated clinicians "
                    "with a public phone, not board-confirmed Current licenses."
                ),
                "stats": {
                    "boardActive": total,
                    "nppesHarvested": total,
                    "matchedWithContact": len(bucket),
                    "matchedNoContact": 0,
                    "unmatchedActiveBoard": total - len(bucket),
                },
                "clinicians": bucket,
                "unmatchedBoard": [],
            }
            temporary = path.with_suffix(path.suffix + ".tmp")
            with temporary.open("w") as handle:
                json.dump(roster, handle, separators=(",", ":"))
                handle.write("\n")
            os.replace(temporary, path)
            print(f"{path.name}: {len(bucket):,} contactable of {total:,}", flush=True)


if __name__ == "__main__":
    main()
