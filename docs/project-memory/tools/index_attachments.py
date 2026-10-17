#!/usr/bin/env python3
"""Read-only attachment index for docs/project-memory/attachments/INDEX.csv.

Inputs: attachments/CHAT_ATTACHMENT_REFERENCES.csv (from index_chats.py), the
Cursor asset folders of the ISALWA projects, and KNOWN_MISSING below (originals
the takeover package records as missing). For each file it reports whether it
exists now, its SHA-256, and whether the same bytes are a git object in this
repository (with one path that holds it). It never copies or moves files.

A path under /Users/... is a Mac-local location, never a durable backup.
"""
from __future__ import annotations

import csv
import hashlib
import subprocess
from pathlib import Path

HOME = Path.home()
REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "docs/project-memory/attachments"
ASSET_DIRS = [
    HOME / ".cursor/projects/Users-carmen-Projects-isalwa/assets",
    HOME / ".cursor/projects/Users-carmen-projects-isalwa-apps-architect/assets",
]

# Recorded as missing in ENGINEERING_TAKEOVER_20261016/START_HERE.md §4 and
# INTERVIEW_RECOVERY_SUPPLEMENT_20261016/02_SEARCH_LOG_AND_UNFOUND.md.
KNOWN_MISSING = [
    ("CatalogoVitriCompleto2026.pdf", "takeover START_HERE §4; LANE-A receipt (expected sha256 4de2f923…c25b0)", "business (supplier catalog)"),
    ("Vitri2026.2027.pdf", "takeover START_HERE §4", "business (supplier catalog)"),
    ("Isa paper forms: nota, cotización, recibo (photos/scans)", "takeover START_HERE §4; originals O11, O12 (descriptions only)", "customer/business documents; may hold personal data"),
    ("Pasted markdown(20260823-152232).md", "takeover START_HERE header: held by the receiving engineer, not on this Mac", "engineering"),
    ("Pasted markdown(20260913-171335).md", "takeover START_HERE header: held by the receiving engineer, not on this Mac", "engineering"),
    ("Pasted markdown(20260914-124432).md", "takeover START_HERE header: held by the receiving engineer, not on this Mac", "engineering"),
    ("Architect owner export (ws_isalwa)", "takeover 10_ARCHITECT_EXPORT_CHECKLIST.md; reserved folder isalwa-source/2026-10-16-architect-export/", "interview data; personal data"),
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def git_objects() -> dict[str, str]:
    listing = subprocess.run(
        ["git", "-C", str(REPO), "rev-list", "--all", "--objects"], capture_output=True, text=True, check=True
    ).stdout
    found: dict[str, str] = {}
    for line in listing.splitlines():
        oid, _, path = line.partition(" ")
        if path and oid not in found:
            found[oid] = path
    return found


def blob_id(path: Path) -> str:
    return subprocess.run(
        ["git", "hash-object", str(path)], capture_output=True, text=True, check=True
    ).stdout.strip()


def sensitivity(name: str) -> str:
    lower = name.lower()
    if lower.endswith((".xls", ".xlsx", ".csv")) or "cliente" in lower or "datos" in lower:
        return "personal data likely (customers/staff); path reference only"
    if lower.startswith(("captura", "screenshot", "image")) or lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".heic", ".gif")):
        return "review required (screenshot may show interview, customer or account data)"
    if lower.endswith(".pdf"):
        return "business document; review before sharing"
    return "review required"


def main() -> None:
    objects = git_objects()
    rows, seen = [], set()

    def add(filename: str, source: str, path: Path | None, note_missing: str = "", sens: str = "") -> None:
        key = (filename, str(path) if path else source)
        if key in seen:
            return
        seen.add(key)
        if path and path.is_file():
            digest, blob = sha256(path), blob_id(path)
            in_git = objects.get(blob)
            locator = f"git object {blob} at `{in_git}` (local repo; push status per branch)" if in_git else "none (not in git)"
            availability = f"exists on this Mac at {path}" + ("" if in_git else "; Mac-local only, NOT a durable backup")
        else:
            digest, locator = "", "none"
            availability = note_missing or (f"not found at {path}" if path else "not found on this Mac")
        rows.append([filename, source, locator, digest, sens or sensitivity(filename), availability])

    for asset_dir in ASSET_DIRS:
        if asset_dir.is_dir():
            for f in sorted(asset_dir.iterdir()):
                if f.is_file():
                    add(f.name, f"Cursor asset folder {asset_dir.parent.name}", f)

    refs = OUT / "CHAT_ATTACHMENT_REFERENCES.csv"
    if refs.exists():
        for r in csv.DictReader(refs.open()):
            raw = r["absolute_path_as_written"]
            add(r["filename"], f"chat {r['chat_id']} line {r['jsonl_line']}", Path(raw) if raw else None,
                note_missing="" if raw else "named in chat without a path; location unknown")

    for name, source, sens in KNOWN_MISSING:
        add(name, source, None, note_missing="MISSING: not available on this Mac; owner must supply", sens=sens)

    with (OUT / "INDEX.csv").open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["filename", "source", "durable_locator", "sha256", "sensitivity", "availability"])
        w.writerows(rows)
    print(f"attachments={len(rows)}")


if __name__ == "__main__":
    main()
