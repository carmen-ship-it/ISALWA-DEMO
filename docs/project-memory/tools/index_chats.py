#!/usr/bin/env python3
"""Read-only ISALWA chat index for docs/project-memory.

Reads Cursor agent transcripts (never writes to them) and the preserved-text
corpus, and writes three CSVs into docs/project-memory/:

  chats/CHAT_INDEX.csv          one row per parent chat (subagents counted, not listed)
  chats/USER_TURN_COVERAGE.csv  one row per user turn: preserved verbatim elsewhere or not
  attachments/CHAT_ATTACHMENT_REFERENCES.csv  attachment references found in user turns

Output holds metadata only: ids, dates, counts, a redacted first line, and
locators. No message bodies are copied. Emails, phone numbers, URLs with
credentials and token-shaped strings are redacted from the first line.

Usage: python3 docs/project-memory/tools/index_chats.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import subprocess
from pathlib import Path

HOME = Path.home()
PROJECTS = HOME / ".cursor/projects"
REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "docs/project-memory"

ISALWA_PROJECT_PREFIXES = ("Users-carmen-Projects-isalwa", "Users-carmen-projects-isalwa")
EXTRA_PROJECTS = ("empty-window",)  # only chats that mention ISALWA are kept

CORPUS_ROOTS = [
    HOME / "projects/isalwa-handoff/ENGINEERING_TAKEOVER_20261016",
    HOME / "projects/isalwa-handoff/INTERVIEW_RECOVERY_SUPPLEMENT_20261016",
    HOME / "projects/isalwa-review-evidence",
]

TS = re.compile(r"<timestamp>([^<]+)</timestamp>")
QUERY = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.S)
IMAGE_BLOCK = re.compile(r"<image_files>(.*?)</image_files>", re.S)
ATTACH_PATH = re.compile(
    r"(?:(?:/Users/[^\s\"'<>|]+)|(?:[\w.\-() ]+))\.(?:png|jpe?g|gif|webp|heic|pdf|xlsx?|csv|docx?|pptx?|zip|mp4|mov|m4a|mp3|wav)\b",
    re.I,
)
REDACT = [
    (re.compile(r"(?<![\w.+-])(?!git@)[\w.+-]+@[\w-]+\.[\w.]+"), "[email]"),
    (re.compile(r"(?<![\w/.(-])(?!\d{8}-\d{6}\))\+?\d[\d\s().-]{8,}\d(?![\w/.-])"), "[number]"),
    (re.compile(r"\b(?:sk|pk|rk|ghp|gho|xox[abp]|eyJ)[A-Za-z0-9_\-]{12,}"), "[token]"),
    (re.compile(r"\w+://[^\s/]*:[^\s/]*@\S+"), "[url-with-credentials]"),
]
# Turns without <user_query> are system context (tool catalogs, subagent lists);
# these prefixes are system notifications sent as user turns. Neither is user content.
SYSTEM_PREFIXES = (
    "Briefly inform the user about the task result",
    "Perform any necessary follow-up actions in response to the subagent",
)
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def redact(text: str) -> str:
    for pattern, token in REDACT:
        text = pattern.sub(token, text)
    return text


def corpus_files() -> list[Path]:
    files: list[Path] = []
    for root in CORPUS_ROOTS:
        if root.exists():
            files += [p for p in root.rglob("*") if p.suffix in {".md", ".txt", ".csv"} and p.is_file()]
    tracked = subprocess.run(
        ["git", "-C", str(REPO), "ls-files", "docs"], capture_output=True, text=True, check=True
    ).stdout.split()
    files += [REPO / t for t in tracked if t.endswith((".md", ".txt", ".csv")) and not t.startswith("docs/project-memory/")]
    files += [p for p in (OUT / "history").glob("*.md")] + [OUT / "DECISIONS.md"]
    return [f for f in files if f.exists()]


def load_corpus() -> tuple[str, list[tuple[str, str]], set[str]]:
    docs, ids = [], set()
    for f in corpus_files():
        try:
            raw = f.read_text(errors="ignore")
        except OSError:
            continue
        label = str(f.relative_to(REPO)) if f.is_relative_to(REPO) else str(f).replace(str(HOME), "~")
        docs.append((label, norm(raw)))
        ids.update(UUID.findall(raw))
    return "\n".join(text for _, text in docs), docs, ids


def locate(probe: str, docs: list[tuple[str, str]]) -> str:
    return next((label for label, text in docs if probe in text), "")


# Chats that must not be deleted regardless of coverage.
ACTIVE_CHATS = {
    "6e146cf5-2f69-4c8a-86ce-a29202d046ee": "current integrator chat (active)",
}
RECENT_FROM = (2026, 10, 16)  # chats active on or after this date are held


def chat_date(stamp: str) -> tuple[int, int, int] | None:
    m = re.search(r"(\w{3}) (\d{1,2}), (\d{4})", stamp)
    if not m:
        return None
    month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].index(m.group(1)) + 1
    return int(m.group(3)), month, int(m.group(2))


def readiness(row: dict) -> tuple[str, str]:
    if row["chat_id"] in ACTIVE_CHATS:
        return "HOLD_ACTIVE", ACTIVE_CHATS[row["chat_id"]]
    last = chat_date(row["last"])
    if last and last >= RECENT_FROM:
        return "HOLD_ACTIVE", "active on or after 2026-10-16 (lanes, review or takeover work)"
    reasons = []
    missing = row["turns"] - row["covered"]
    if missing:
        reasons.append(f"{missing} of {row['turns']} user turns not preserved verbatim")
    if row["attach"] or row["media"]:
        reasons.append(f"{row['attach'] + row['media']} attachment references; see attachments/INDEX.csv (Mac-local copies are not durable)")
    if row["subagents"]:
        reasons.append(f"{row['subagents']} subagent transcripts not reviewed for unique tool evidence")
    if reasons:
        return "NOT_READY", "; ".join(reasons)
    return "READY_CANDIDATE", "every user turn preserved verbatim at the listed locators; no attachments; no subagents"


def user_turns(path: Path):
    for lineno, line in enumerate(path.open(errors="ignore"), 1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("role") != "user":
            continue
        parts = event.get("message", {}).get("content", [])
        text = "\n".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type") == "text")
        non_text = [p.get("type") for p in parts if isinstance(p, dict) and p.get("type") != "text"]
        yield lineno, text, non_text


OUT_OF_SCOPE: list[tuple[str, str, int, int, int]] = []  # mixed chats dominated by CCA/Rose: not ISALWA memory
CCA_NAME = re.compile(r"CCA|ROSE|Rose|FRR|AuditEngine")  # CCA files stay out of the ISALWA index
CCA_REFS_OMITTED = [0]
ARCHIVE_FILES = {"START_HERE.md", "CURRENT_STATE.md", "DECISIONS.md", "SOURCE_INDEX.csv", "INDEX.csv",
                 "CHAT_INDEX.csv", "USER_TURN_COVERAGE.csv", "DELETION_READINESS.csv"}


def filename_ref(ref: str) -> str | None:
    """Trim a bare filename caught inside prose to its filename-like suffix."""
    if CCA_NAME.search(ref):
        CCA_REFS_OMITTED[0] += 1
        return None
    if ref.startswith("/"):
        return ref
    tokens = ref.removeprefix("- ").split(" ")
    keep: list[str] = []
    for token in reversed(tokens):
        if keep and not (token.isupper() or not token.isalpha()):
            break
        keep.insert(0, token)
    name = " ".join(keep).strip()
    return None if not name or name in ARCHIVE_FILES else name


def chats():
    for project in sorted(PROJECTS.iterdir()):
        name = project.name
        if not (name.startswith(ISALWA_PROJECT_PREFIXES) or name in EXTRA_PROJECTS):
            continue
        root = project / "agent-transcripts"
        if not root.is_dir():
            continue
        for chat_dir in sorted(p for p in root.iterdir() if p.is_dir()):
            main = chat_dir / f"{chat_dir.name}.jsonl"
            if not main.exists():
                continue
            low = main.read_text(errors="ignore").lower()
            if name in EXTRA_PROJECTS and low.count("isalwa") == 0:
                continue
            if low.count("isalwa") < low.count("cca") + low.count("rose"):
                OUT_OF_SCOPE.append((chat_dir.name, name, low.count("isalwa"), low.count("cca"), low.count("rose")))
                continue
            subagents = list((chat_dir / "subagents").glob("*.jsonl")) if (chat_dir / "subagents").is_dir() else []
            yield name, chat_dir.name, main, subagents


def main() -> None:
    corpus, docs, cited_ids = load_corpus()
    (OUT / "chats").mkdir(parents=True, exist_ok=True)
    (OUT / "attachments").mkdir(parents=True, exist_ok=True)
    chat_rows, turn_rows, attach_rows, ready_rows = [], [], [], []
    for project, chat_id, main_path, subagents in chats():
        stamps, first_line, turns, covered, attach_refs, inline_media = [], "", 0, 0, set(), 0
        locators: set[str] = set()
        seen_bodies: set[str] = set()
        for lineno, text, non_text in user_turns(main_path):
            stamp = TS.search(text)
            if stamp:
                stamps.append(stamp.group(1).strip())
            query = QUERY.search(text)
            body = query.group(1).strip() if query else ""
            if not body or body.startswith(SYSTEM_PREFIXES) or body in seen_bodies:
                continue
            seen_bodies.add(body)
            turns += 1
            if not first_line:
                first_line = redact(body.splitlines()[0])[:120]
            probe = norm(body)
            hit = len(probe) >= 20 and probe in corpus
            where = locate(probe, docs) if hit else ""
            if where:
                locators.add(where)
            covered += int(hit)
            inline_media += len(non_text)
            scan = body + "\n" + "\n".join(IMAGE_BLOCK.findall(text))
            refs = sorted({r for r in (filename_ref(m.group(0).strip()) for m in ATTACH_PATH.finditer(scan)) if r})
            for ref in refs:
                attach_refs.add(ref)
                attach_rows.append([chat_id, project, lineno, stamp.group(1).strip() if stamp else "", Path(ref).name, ref if ref.startswith("/") else ""])
            turn_rows.append([chat_id, lineno, stamp.group(1).strip() if stamp else "", len(body), "yes" if hit else "no", where, hashlib.sha256(body.encode()).hexdigest()[:16]])
        status, reason = readiness({
            "chat_id": chat_id, "last": stamps[-1] if stamps else "", "turns": turns, "covered": covered,
            "attach": len(attach_refs), "media": inline_media, "subagents": len(subagents),
        })
        ready_rows.append([chat_id, project, stamps[0] if stamps else "", stamps[-1] if stamps else "",
                           status, reason, " ; ".join(sorted(locators))])
        chat_rows.append([
            chat_id, project, stamps[0] if stamps else "", stamps[-1] if stamps else "",
            turns, covered, len(subagents), inline_media, len(attach_refs),
            "yes" if chat_id in cited_ids else "no", first_line,
        ])
    with (OUT / "chats/CHAT_INDEX.csv").open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["chat_id", "cursor_project", "first_timestamp", "last_timestamp", "user_turns",
                    "user_turns_preserved_verbatim", "subagent_transcripts", "inline_media_items",
                    "attachment_references", "chat_id_cited_in_archive", "first_line_redacted"])
        w.writerows(chat_rows)
    with (OUT / "chats/USER_TURN_COVERAGE.csv").open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["chat_id", "jsonl_line", "timestamp", "chars", "preserved_verbatim", "preserved_at", "sha256_16"])
        w.writerows(turn_rows)
    with (OUT / "chats/DELETION_READINESS.csv").open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["chat_id", "cursor_project", "first_timestamp", "last_timestamp", "status", "reason", "preserved_at"])
        w.writerows(ready_rows)
    with (OUT / "attachments/CHAT_ATTACHMENT_REFERENCES.csv").open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["chat_id", "cursor_project", "jsonl_line", "timestamp", "filename", "absolute_path_as_written"])
        w.writerows(attach_rows)
    with (OUT / "chats/OUT_OF_SCOPE_CHATS.csv").open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["chat_id", "cursor_project", "isalwa_mentions", "cca_mentions", "rose_mentions", "reason"])
        w.writerows([*row, "mixed chat dominated by CCA/Rose content; not ISALWA memory (keep ISALWA separate from CCA)"] for row in OUT_OF_SCOPE)
    print(f"chats={len(chat_rows)} user_turns={len(turn_rows)} attachment_refs={len(attach_rows)} out_of_scope={len(OUT_OF_SCOPE)} cca_refs_omitted={CCA_REFS_OMITTED[0]}")


if __name__ == "__main__":
    main()
