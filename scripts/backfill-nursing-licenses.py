#!/usr/bin/env python3
"""Fill empty RN and LVN license numbers from the public NPPES registry.

NPPES stores the state license on each taxonomy (taxonomies[].license).
The nursing rosters were built without that field, so the table column is blank.
"""

import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def clean_license(profession: str, value: str) -> str:
    """NPPES sometimes stores the credential in front of the state license."""
    text = (value or "").strip()
    prefixes = {"lvn": ["LVN", "LPN", "VN"], "rn": ["RN"]}.get(profession, [])
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


JOBS = [
    ("data/ca-lvn-roster.json", ("164X", "164W"), "lvn"),
    ("data/ca-rn-roster.json", ("163W",), "rn"),
]
WORKERS = 12
CHECKPOINT = "/tmp/opusgrex-nursing-license-checkpoint.json"


def lookup(npi: str, prefixes: tuple[str, ...]):
    url = f"https://npiregistry.cms.hhs.gov/api/?version=2.1&number={npi}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=25) as response:
                data = json.load(response)
            taxes = ((data.get("results") or [{}])[0].get("taxonomies") or [])
            matches = []
            for tax in taxes:
                code = tax.get("code") or ""
                if not any(code.startswith(prefix) for prefix in prefixes):
                    continue
                license_number = (tax.get("license") or "").strip()
                if not license_number:
                    continue
                matches.append(
                    (
                        tax.get("state") == "CA",
                        bool(tax.get("primary")),
                        license_number,
                    )
                )
            if not matches:
                return npi, ""
            matches.sort(key=lambda item: (not item[0], not item[1]))
            return npi, matches[0][2]
        except Exception:
            time.sleep(0.4 * (attempt + 1))
    return npi, None


def write_roster(path: str, roster: dict) -> None:
    temporary = path + ".tmp"
    with open(temporary, "w") as handle:
        json.dump(roster, handle, separators=(",", ":"))
        handle.write("\n")
    os.replace(temporary, path)


def load_checkpoint() -> dict:
    if not os.path.exists(CHECKPOINT):
        return {}
    with open(CHECKPOINT) as handle:
        return json.load(handle)


def save_checkpoint(checkpoint: dict) -> None:
    temporary = CHECKPOINT + ".tmp"
    with open(temporary, "w") as handle:
        json.dump(checkpoint, handle, separators=(",", ":"))
    os.replace(temporary, CHECKPOINT)


def main() -> None:
    checkpoint = load_checkpoint()
    for relative, prefixes, profession in JOBS:
        path = os.path.join(ROOT, relative)
        with open(path) as handle:
            roster = json.load(handle)
        by_npi = {}
        pending = []
        for clinician in roster["clinicians"]:
            npi = clinician.get("npi") or ""
            if npi:
                by_npi[npi] = clinician
            existing = clean_license(profession, clinician.get("licenseNumber") or "")
            if existing:
                clinician["licenseNumber"] = existing
                continue
            if npi in checkpoint:
                clinician["licenseNumber"] = clean_license(profession, checkpoint[npi])
                continue
            if npi:
                pending.append(npi)
        write_roster(path, roster)
        print(
            f"{relative}: looking up {len(pending):,} licenses",
            flush=True,
        )
        started = time.time()
        done = 0
        found = 0
        with ThreadPoolExecutor(WORKERS) as pool:
            futures = [pool.submit(lookup, npi, prefixes) for npi in pending]
            for future in as_completed(futures):
                npi, license_number = future.result()
                done += 1
                if license_number is None:
                    continue
                checkpoint[npi] = clean_license(profession, license_number)
                if checkpoint[npi]:
                    found += 1
                    by_npi[npi]["licenseNumber"] = checkpoint[npi]
                if done == 25 or done % 400 == 0:
                    save_checkpoint(checkpoint)
                    write_roster(path, roster)
                    rate = done / max(time.time() - started, 0.1)
                    print(
                        f"  {relative} {done:,}/{len(pending):,} found {found:,} ({rate:.1f}/s)",
                        flush=True,
                    )
        save_checkpoint(checkpoint)
        write_roster(path, roster)
        filled = sum(
            1
            for clinician in roster["clinicians"]
            if (clinician.get("licenseNumber") or "").strip()
        )
        print(
            f"done {relative}: {filled:,}/{len(roster['clinicians']):,} have a license",
            flush=True,
        )


if __name__ == "__main__":
    main()
