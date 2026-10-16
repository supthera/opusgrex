#!/usr/bin/env python3
"""Fill roster license numbers from a local NPPES dissemination CSV.

Streams the CMS file once, keeps the practice-state license for each NPI in
the California nursing rosters and the Texas and Florida recruiting rosters,
and strips a leading RN / LVN / VN / LPN credential when the rest is a number.
"""

import csv
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATES = {"ca": "CA", "tx": "TX", "fl": "FL"}


def clean_license(profession: str, value: str) -> str:
    text = (value or "").strip()
    prefixes = {
        "rn": ["RN"],
        "lvn": ["LVN", "LPN", "VN"],
        "ot": ["OT"],
        "ota": ["COTA", "OTA"],
        "pt": ["PT"],
        "pta": ["PTA"],
    }.get(profession, [])
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


def roster_paths(data_dir: Path) -> list[Path]:
    paths = [
        data_dir / "ca-rn-roster.json",
        data_dir / "ca-lvn-roster.json",
    ]
    for state in ("tx", "fl"):
        for profession in ("ot", "ota", "pt", "pta", "lvn", "rn"):
            paths.append(data_dir / f"{state}-{profession}-roster.json")
    missing = [path for path in paths if not path.exists()]
    if missing:
        raise SystemExit("Missing roster files:\n" + "\n".join(str(path) for path in missing))
    return paths


def pick_license(row: list[str], slots: list[tuple[int, int, int]], state: str) -> str:
    fallback = ""
    state_match = ""
    primary = ""
    for license_i, state_i, primary_i in slots:
        license_number = row[license_i].strip()
        if not license_number:
            continue
        if not fallback:
            fallback = license_number
        if row[state_i].strip().upper() == state:
            if not state_match:
                state_match = license_number
            if row[primary_i].strip().upper() == "Y":
                primary = license_number
    return primary or state_match or fallback


def write_roster(path: Path, roster: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w") as handle:
        json.dump(roster, handle, separators=(",", ":"))
        handle.write("\n")
    os.replace(temporary, path)


def main() -> None:
    csv.field_size_limit(sys.maxsize)
    if len(sys.argv) != 3 or sys.argv[1] != "--csv":
        raise SystemExit(
            "Usage: python3 scripts/fill-roster-licenses.py --csv <npidata_pfile.csv>"
        )
    csv_path = Path(sys.argv[2])
    data_dir = ROOT / "data"
    loaded = []
    wanted: dict[str, list[tuple[str, str, dict]]] = {}
    for path in roster_paths(data_dir):
        state = STATES[path.name[:2]]
        with path.open() as handle:
            roster = json.load(handle)
        profession = str(roster.get("profession") or "")
        loaded.append((path, roster, profession))
        for clinician in roster.get("clinicians") or []:
            npi = str(clinician.get("npi") or "").strip()
            if npi:
                wanted.setdefault(npi, []).append((state, profession, clinician))
        print(f"loaded {path.name}: {len(roster.get('clinicians') or []):,}", flush=True)

    found = 0
    seen = 0
    pending = {id(clinician) for group in wanted.values() for _, _, clinician in group}
    with csv_path.open(newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        index = {name: position for position, name in enumerate(header)}
        npi_i = index["NPI"]
        slots = []
        for slot in range(1, 16):
            slots.append(
                (
                    index[f"Provider License Number_{slot}"],
                    index[f"Provider License Number State Code_{slot}"],
                    index[f"Healthcare Provider Primary Taxonomy Switch_{slot}"],
                )
            )
        for row in reader:
            seen += 1
            if seen % 1_000_000 == 0:
                print(f"scanned {seen:,} rows, licenses found {found:,}", flush=True)
            targets = wanted.get(row[npi_i])
            if not targets:
                continue
            for state, profession, clinician in targets:
                raw = pick_license(row, slots, state)
                if not raw:
                    continue
                clinician["licenseNumber"] = clean_license(profession, raw)
                if id(clinician) in pending:
                    pending.discard(id(clinician))
                    found += 1
            if not pending:
                break

    print(f"scanned {seen:,} rows, wrote {found:,} licenses", flush=True)
    for path, roster, profession in loaded:
        filled = 0
        for clinician in roster.get("clinicians") or []:
            clinician["licenseNumber"] = clean_license(
                profession, clinician.get("licenseNumber") or ""
            )
            if clinician["licenseNumber"]:
                filled += 1
        write_roster(path, roster)
        print(
            f"{path.name}: {filled:,}/{len(roster.get('clinicians') or []):,} with a license",
            flush=True,
        )


if __name__ == "__main__":
    main()
