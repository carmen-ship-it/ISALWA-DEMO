#!/usr/bin/env python3
"""Build the sanitized ISALWA chat-preservation bundle (read-only toward Cursor).

For every in-scope chat that is not held as active, writes one markdown file:
each unique user turn verbatim, the agent's final reply to that turn verbatim,
and for each subagent its task and final report verbatim. Redactions are
applied (see REDACT) and counted; the SHA-256 of every original body is
recorded so coverage can be checked without keeping the unredacted text.

Not preserved: intermediate agent progress text, tool calls and tool results.
Cursor's transcript export does not contain tool results.

Also writes ISALWA-subject excerpts from mixed chats (MIXED_EXCERPTS), copies
the screenshots cleared for the sanitized backup (ATTACHMENTS_CLEARED), and a
MANIFEST.sha256 over the whole bundle.

Usage: python3 docs/project-memory/tools/preserve_chats.py <bundle_dir>
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HOME = Path.home()
PROJECTS = HOME / ".cursor/projects"
REPO = Path(__file__).resolve().parents[3]
MEMORY = REPO / "docs/project-memory"

TS = re.compile(r"<timestamp>([^<]+)</timestamp>")
QUERY = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.S)
SYSTEM_PREFIXES = (
    "Briefly inform the user about the task result",
    "Perform any necessary follow-up actions in response to the subagent",
)
REDACT = [
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S), "[private key redacted]"),
    (re.compile(r"\w+://[^\s/:@]+:[^\s/@]+@\S+"), "[url-with-credentials redacted]"),
    (re.compile(r"(?<![\w.+-])(?!git@)[\w.+-]+@[\w-]+\.[\w.]+"), "[email redacted]"),
    (re.compile(r"\b(?:sk|pk|rk|ghp|gho|ghs|github_pat|xox[abp]|eyJ|whsec|re|sbp|rnd)_[A-Za-z0-9_\-]{12,}"), "[token redacted]"),
    (re.compile(r"\b(?:sk|eyJ)[A-Za-z0-9\-]{20,}"), "[token redacted]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[token redacted]"),
    (re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]{16,}"), "Bearer [token redacted]"),
    (re.compile(r"(?i)((?:password|passwd|pwd|contraseña|secret|api[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*)(?![\[<{$])[\"']?[^\s\"'`,;]{6,}"), r"\1[secret redacted]"),
    (re.compile(r"\b(?!(?:10|127|0)\.)(?:\d{1,3}\.){3}\d{1,3}\b(?![\w.])"), "[ip redacted]"),
    (re.compile(r"(?<![\w/.(#:-])(?!\d{8}-\d{6}\))\+?\d[\d\s().-]{8,}\d(?![\w/.:-])"), "[number redacted]"),
]

# ISALWA-subject turns inside chats that are otherwise CCA work (inspected by content).
MIXED_EXCERPTS = {
    "ddd43714-819a-4e7b-b12c-9f3e423f358b": ("Users-carmen-Projects-isalwa", [46, 53, 55, 59, 72, 76],
        "2026-10-01 Mac disk recovery (mostly CCA); ISALWA preservation-to-GitHub turns"),
    "69935342-a2f8-4d7c-91fe-13cc398ab8f3": ("empty-window", [191, 221],
        "Cursor operating environment / Twin OS (mostly CCA); portfolio-separation turns"),
}
# Reviewed 2026-10-17. Excluded: assets/...2026-09-16_a_la_s__14.29.19-144441da-... (customer names and phone numbers).
ATTACHMENTS_CLEARED = {
    "Users-carmen-Projects-isalwa": [
        "Captura_de_pantalla_2026-07-24_a_la_s__15.00.23-4e17f165-b8c8-4730-a5b1-3311cfd1ea35.png",
        "Captura_de_pantalla_2026-07-25_a_la_s__09.54.25-4be4bd0f-c760-4b1e-83fa-dfe46cb3407a.png",
        "Captura_de_pantalla_2026-07-25_a_la_s__10.25.01-1f908c75-22a9-4895-a722-4decf8ec8b06.png",
        "Captura_de_pantalla_2026-08-23_a_la_s__11.08.07-3e3cfbf9-9095-4355-b1a2-7913a1090028.png",
        "Captura_de_pantalla_2026-09-13_a_la_s__13.30.22-d25c6066-fd25-4a38-b7a3-2e858365598c.png",
        "Captura_de_pantalla_2026-09-14_a_la_s__03.27.26-b2826d4a-a548-4a16-958b-0fb6a3877eb7.png",
        "Captura_de_pantalla_2026-09-16_a_la_s__03.45.55-9880a435-ec9b-4b33-acad-90b6b05627fe.png",
        "Captura_de_pantalla_2026-10-16_a_la_s__23.55.38-3cf8e0f0-d7e8-4654-a1f3-614935b39b81.png",
    ],
    "Users-carmen-projects-isalwa-apps-architect": [
        "Captura_de_pantalla_2026-07-25_a_la_s__18.48.05-860c49c7-4f36-490e-ad6c-70ff411a7aef.png",
        "Captura_de_pantalla_2026-07-25_a_la_s__18.55.15-26676157-adda-4ac9-af39-bacb0173fdc8.png",
        "Captura_de_pantalla_2026-07-25_a_la_s__18.56.27-281765da-b212-4736-9e0c-6c777a35c747.png",
        "Captura_de_pantalla_2026-07-26_a_la_s__11.04.43-1f527eb4-9b55-40dc-b41c-839f55db2b01.png",
        "Captura_de_pantalla_2026-07-26_a_la_s__20.08.24-ec8faf2c-cac4-4a20-ba64-e726a150ea8a.png",
        "Captura_de_pantalla_2026-07-26_a_la_s__20.09.52-c1151a30-e9de-4ec2-bd8b-e50b0260753b.png",
        "Captura_de_pantalla_2026-07-27_a_la_s__09.00.24-9117fbee-efed-4c39-8c77-1c57fa70bf53.png",
        "Captura_de_pantalla_2026-07-27_a_la_s__09.02.01-c493ee8c-8433-44b1-960b-a4eb4fef2a7c.png",
        "Captura_de_pantalla_2026-07-27_a_la_s__10.28.36-cdae42bf-b8f5-4ca8-9e3a-064f50c33680.png",
        "Captura_de_pantalla_2026-07-27_a_la_s__11.16.28-aaa4a616-21a4-4201-a130-716f596a0e05.png",
    ],
}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def redact(text: str) -> tuple[str, int]:
    total = 0
    for pattern, token in REDACT:
        text, n = pattern.subn(token, text)
        total += n
    return text, total


def fence(text: str) -> str:
    longest = max((len(m) for m in re.findall(r"`+", text)), default=0)
    return "`" * max(4, longest + 1)


def block(label: str, body: str) -> str:
    digest = hashlib.sha256(body.encode()).hexdigest()
    clean, count = redact(body)
    f = fence(clean)
    return f"**{label}** — sha256 (original) `{digest}` · {len(body)} chars · redactions {count}\n\n{f}text\n{clean}\n{f}\n\n"


def text_of(event: dict) -> str:
    parts = event.get("message", {}).get("content", [])
    return "\n".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type") == "text").strip()


def turns(path: Path):
    """Yield (line, timestamp, user_body, final_agent_reply) per unique user turn."""
    events = []
    for lineno, raw in enumerate(path.open(errors="ignore"), 1):
        try:
            events.append((lineno, json.loads(raw)))
        except json.JSONDecodeError:
            continue
    seen: set[str] = set()
    current = None
    for lineno, event in events:
        role = event.get("role")
        if role == "user":
            text = text_of(event)
            query = QUERY.search(text)
            body = query.group(1).strip() if query else ""
            if not body or body.startswith(SYSTEM_PREFIXES) or body in seen:
                continue
            if current:
                yield current
            seen.add(body)
            stamp = TS.search(text)
            current = [lineno, stamp.group(1).strip() if stamp else "", body, ""]
        elif role == "assistant" and current is not None:
            reply = text_of(event)
            if reply:
                current[3] = reply
    if current:
        yield current


def subagent_record(path: Path) -> tuple[str, str]:
    task, report = "", ""
    for raw in path.open(errors="ignore"):
        try:
            event = json.loads(raw)
        except json.JSONDecodeError:
            continue
        text = text_of(event)
        if event.get("role") == "user" and not task:
            query = QUERY.search(text)
            task = (query.group(1) if query else text).strip()
        elif event.get("role") == "assistant" and text:
            report = text
    return task, report


def month_of(stamp: str) -> str:
    m = re.search(r"(\w{3}) \d{1,2}, (\d{4})", stamp)
    return f"{m.group(2)}-{MONTHS.index(m.group(1)) + 1:02d}" if m else "undated"


def main() -> None:
    bundle = Path(sys.argv[1]).resolve()
    if bundle.is_relative_to(REPO):
        raise SystemExit("bundle must live outside the repository")
    readiness = list(csv.DictReader((MEMORY / "chats/DELETION_READINESS.csv").open()))
    index = {r["chat_id"]: r for r in csv.DictReader((MEMORY / "chats/CHAT_INDEX.csv").open())}
    written = 0
    for row in readiness:
        if row["status"] == "HOLD_ACTIVE":
            continue
        chat_id, project = row["chat_id"], row["cursor_project"]
        main_path = PROJECTS / project / "agent-transcripts" / chat_id / f"{chat_id}.jsonl"
        sub_dir = main_path.parent / "subagents"
        subagents = sorted(sub_dir.glob("*.jsonl")) if sub_dir.is_dir() else []
        title, _ = redact(index[chat_id]["first_line_redacted"])
        parts = [
            f"# Chat `{chat_id}`\n\n",
            f"| field | value |\n|---|---|\n| title (first line) | {title.replace('|', '/')} |\n"
            f"| Cursor project | `{project}` |\n| first | {row['first_timestamp']} |\n| last | {row['last_timestamp']} |\n"
            f"| transcript sha256 | `{hashlib.sha256(main_path.read_bytes()).hexdigest()}` |\n\n",
            "Verbatim except the counted redactions. Speaker of user turns: Carmen (or text she relayed). "
            "Agent text is the final reply to each turn only; intermediate progress text, tool calls and tool "
            "results are not preserved (tool results are not in Cursor's transcript export).\n\n",
        ]
        count = 0
        for lineno, stamp, body, reply in turns(main_path):
            count += 1
            parts.append(f"---\n\n## Turn {count} — {stamp or 'no timestamp'} — line {lineno}\n\n")
            parts.append(block("User", body))
            parts.append(block("Agent final reply", reply) if reply else "_No agent text reply recorded._\n\n")
        for sub in subagents:
            task, report = subagent_record(sub)
            parts.append(f"---\n\n## Subagent `{sub.stem}`\n\n")
            parts.append(block("Task", task) if task else "_No task text._\n\n")
            parts.append(block("Final report", report) if report else "_No report text._\n\n")
        parts.append(f"---\n\nUSER_TURNS_PRESERVED: {count}\nSUBAGENTS_PRESERVED: {len(subagents)}/{len(subagents)}\n")
        out = bundle / "chats" / month_of(row["first_timestamp"]) / f"{chat_id}.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("".join(parts))
        written += 1

    for chat_id, (project, lines, note) in MIXED_EXCERPTS.items():
        path = PROJECTS / project / "agent-transcripts" / chat_id / f"{chat_id}.jsonl"
        wanted = set(lines)
        parts = [f"# ISALWA excerpts from mixed chat `{chat_id}`\n\n{note}. The chat stays out of the ISALWA "
                 "deletion list: the rest is CCA work and is not judged here.\n\n"]
        for lineno, stamp, body, reply in turns(path):
            if lineno in wanted:
                parts.append(f"---\n\n## {stamp} — line {lineno}\n\n" + block("User", body)
                             + (block("Agent final reply", reply) if reply else ""))
        out = bundle / "mixed" / f"{chat_id}-isalwa-excerpts.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("".join(parts))

    att = bundle / "attachments"
    att.mkdir(parents=True, exist_ok=True)
    for project, names in ATTACHMENTS_CLEARED.items():
        for name in names:
            shutil.copy2(PROJECTS / project / "assets" / name, att / name)

    memory = bundle / "project-memory"
    if memory.exists():
        shutil.rmtree(memory)
    tracked = subprocess.run(["git", "-C", str(REPO), "ls-files", "docs/project-memory"],
                             capture_output=True, text=True, check=True).stdout.split()
    for rel in tracked:
        dest = memory / Path(rel).relative_to("docs/project-memory")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPO / rel, dest)

    files = sorted(p for p in bundle.rglob("*") if p.is_file() and ".git" not in p.parts and p.name != "MANIFEST.sha256")
    with (bundle / "MANIFEST.sha256").open("w") as fh:
        for p in files:
            fh.write(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(bundle)}\n")
    print(f"chat_files={written} mixed={len(MIXED_EXCERPTS)} attachments={sum(map(len, ATTACHMENTS_CLEARED.values()))} manifest_entries={len(files)}")


if __name__ == "__main__":
    main()
