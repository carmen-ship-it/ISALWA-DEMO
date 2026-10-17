#!/usr/bin/env python3
"""Copy selected user turns from one Cursor transcript, verbatim, with provenance.

Read-only toward the transcript. Writes one markdown file. Each turn gets a
header with chat id, JSONL line, timestamp, character count, SHA-256 of the
original body and the number of redactions. Emails, phone numbers,
token-shaped strings and URLs with credentials are replaced; nothing else is
changed.

Usage:
  python3 extract_instructions.py <transcript.jsonl> <out.md> <title> <line> [<line> ...]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

TS = re.compile(r"<timestamp>([^<]+)</timestamp>")
QUERY = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.S)
REDACT = [
    (re.compile(r"(?<![\w.+-])(?!git@)[\w.+-]+@[\w-]+\.[\w.]+"), "[email redacted]"),
    (re.compile(r"(?<![\w/.(-])(?!\d{8}-\d{6}\))\+?\d[\d\s().-]{8,}\d(?![\w/.-])"), "[number redacted]"),
    (re.compile(r"\b(?:sk|pk|rk|ghp|gho|xox[abp]|eyJ)[A-Za-z0-9_\-]{12,}"), "[token redacted]"),
    (re.compile(r"\w+://[^\s/]*:[^\s/]*@\S+"), "[url-with-credentials redacted]"),
]


def main() -> None:
    src, out, title, *lines = sys.argv[1:]
    wanted = {int(n) for n in lines}
    chat_id = Path(src).stem
    parts = [f"# {title}\n",
             "Verbatim user turns copied from a Cursor transcript. Each block is the original wording; "
             "only the redaction tokens listed in its header were substituted. Speaker: the user of the chat "
             "(Carmen, or text Carmen relayed from her engineering counterpart where the turn says so).\n"]
    for lineno, raw in enumerate(Path(src).open(errors="ignore"), 1):
        if lineno not in wanted:
            continue
        event = json.loads(raw)
        if event.get("role") != "user":
            raise SystemExit(f"line {lineno} is not a user turn")
        text = "\n".join(c.get("text", "") for c in event["message"]["content"] if c.get("type") == "text")
        stamp = TS.search(text)
        query = QUERY.search(text)
        body = (query.group(1) if query else text).strip()
        digest = hashlib.sha256(body.encode()).hexdigest()
        count = 0
        for pattern, token in REDACT:
            body, n = pattern.subn(token, body)
            count += n
        parts.append(
            f"\n---\n\n## {stamp.group(1).strip() if stamp else 'no timestamp'} — chat `{chat_id}` line {lineno}\n\n"
            f"| chat | line | chars | sha256 (original body) | redactions |\n|---|---|---|---|---|\n"
            f"| `{chat_id}` | {lineno} | {len(body)} | `{digest}` | {count} |\n\n"
            f"````text\n{body}\n````\n"
        )
    Path(out).write_text("".join(parts))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
