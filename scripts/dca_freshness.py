#!/usr/bin/env python3
"""
Check California DCA Box folders for new public licensee file drops.

Compares live Box metadata (file id, size, sha1, modified_at) against
data/raw/dca-source-manifest.json. Prints a JSON report to stdout and
exits 0 always (use --fail-if-stale to exit 2 when updates are needed).

Usage:
  python3 scripts/dca_freshness.py
  python3 scripts/dca_freshness.py --fail-if-stale
  python3 scripts/dca_freshness.py --write-report data/raw/dca-freshness-report.json
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES_PATH = Path(__file__).resolve().parent / "dca_sources.json"
MANIFEST_PATH = ROOT / "data" / "raw" / "dca-source-manifest.json"
BOX_ITEMS = (
    "https://api.box.com/2.0/folders/{folder_id}/items"
    "?limit=100&fields=name,id,type,size,modified_at,sha1"
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def http_get_text(url: str, headers: dict[str, str] | None = None) -> str:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read().decode("utf-8")


def http_get_json(url: str, headers: dict[str, str] | None = None) -> dict:
    return json.loads(http_get_text(url, headers=headers))


def load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_data_file(token: str, folder_id: str, label: str) -> dict:
    url = BOX_ITEMS.format(folder_id=folder_id)
    payload = http_get_json(url, headers={"Authorization": f"Bearer {token}"})
    for entry in payload.get("entries") or []:
        if "Data" in str(entry.get("name") or ""):
            return entry
    raise RuntimeError(f"{label}: Data file not found in Box folder {folder_id}")


def fingerprint(meta: dict) -> dict:
    return {
        "fileId": str(meta.get("id") or meta.get("fileId") or ""),
        "name": meta.get("name"),
        "size": meta.get("size"),
        "modifiedAt": meta.get("modified_at") or meta.get("modifiedAt"),
        "sha1": meta.get("sha1"),
    }


def changed(live: dict, recorded: dict | None) -> list[str]:
    if not recorded:
        return ["missing_from_manifest"]
    reasons = []
    for key in ("fileId", "size", "sha1", "modifiedAt"):
        if str(live.get(key) or "") != str(recorded.get(key) or ""):
            reasons.append(key)
    return reasons


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fail-if-stale",
        action="store_true",
        help="Exit 2 when one or more DCA sources need a refresh",
    )
    parser.add_argument(
        "--write-report",
        type=Path,
        help="Optional path to write the JSON report",
    )
    args = parser.parse_args()

    config = load_json(SOURCES_PATH, None)
    if not config:
        print(f"Missing sources config: {SOURCES_PATH}", file=sys.stderr)
        return 1

    manifest = load_json(MANIFEST_PATH, {"sources": {}})
    recorded_sources = manifest.get("sources") or {}

    try:
        token = http_get_text(config["tokenUrl"]).strip()
    except urllib.error.URLError as exc:
        print(f"Failed to fetch DCA Box token: {exc}", file=sys.stderr)
        return 1

    results = []
    professions_to_rebuild: list[str] = []
    any_stale = False

    for source in config["sources"]:
        label = source["label"]
        raw_file = source["rawFile"]
        try:
            live_file = find_data_file(token, source["folderId"], label)
        except (RuntimeError, urllib.error.URLError) as exc:
            print(f"{label}: {exc}", file=sys.stderr)
            return 1

        live = fingerprint(live_file)
        recorded = recorded_sources.get(raw_file)
        reasons = changed(live, recorded)
        stale = bool(reasons)
        any_stale = any_stale or stale
        if stale:
            professions_to_rebuild.extend(source.get("professions") or [])

        results.append(
            {
                "label": label,
                "rawFile": raw_file,
                "folderId": source["folderId"],
                "professions": source.get("professions") or [],
                "stale": stale,
                "changeReasons": reasons,
                "live": live,
                "recorded": (
                    {
                        "fileId": recorded.get("fileId"),
                        "name": recorded.get("name"),
                        "size": recorded.get("size"),
                        "modifiedAt": recorded.get("modifiedAt"),
                        "sha1": recorded.get("sha1"),
                    }
                    if recorded
                    else None
                ),
            }
        )

    # Preserve order, unique
    seen = set()
    unique_professions = []
    for key in professions_to_rebuild:
        if key not in seen:
            seen.add(key)
            unique_professions.append(key)

    report = {
        "checkedAt": utc_now(),
        "needsRefresh": any_stale,
        "professionsToRebuild": unique_professions,
        "sources": results,
        "manifestPath": str(MANIFEST_PATH.relative_to(ROOT)),
    }

    text = json.dumps(report, indent=2) + "\n"
    sys.stdout.write(text)
    if args.write_report:
        args.write_report.parent.mkdir(parents=True, exist_ok=True)
        args.write_report.write_text(text, encoding="utf-8")

    if args.fail_if_stale and any_stale:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
