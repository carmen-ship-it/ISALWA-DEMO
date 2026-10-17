#!/usr/bin/env python3
"""Build a redacted ISALWA chat-preservation payload in a new private staging directory.

Read-only toward Cursor transcripts and screenshots. Writes only inside the
validated staging root, never overwrites, never deletes.

Staging layout (created by this script; the directory must not exist yet):

  <staging>/payload/ or payload.INCOMPLETE/   transfer candidate, only after human review
      README.md, STATUS.json, COVERAGE.md, COVERAGE.csv
      chats/<YYYY-MM>/<chat_id>.md, mixed/<chat_id>-isalwa-excerpts.md,
      attachments/<name>, project-memory/<redacted copies>
      MANIFEST.sha256                         exactly the files written to the payload, excluding itself
  <staging>/local-restricted/                 never transferred
      ORIGINAL_HASHES.csv                     SHA-256 of unredacted source blocks (integrity of the local record)
      OMISSIONS.csv                           what was redacted or withheld, by location and class, no values
  <staging>/review/REVIEW_REQUIRED.csv        residual-risk lines per payload file, no values

Status: COMPLETE only when every expected prompt, subagent and cleared attachment
was measured on both sides and matched, and no item failed. Anything else is
INCOMPLETE (exit 2) and cannot clear chat deletion. A chat with redactions or
withheld content is PRESERVED_WITH_OMISSIONS and stays on hold until the omitted
material has an approved durable location. Regex redaction is not proof of
sanitization: the payload is "redacted (regex), NOT REVIEWED" until a human review
of the payload is recorded.

Not preserved: intermediate agent progress text, tool calls and tool results
(Cursor's transcript export holds no tool results). Agent text that follows a
non-prompt event (system notification, context turn) is kept as ambiguous, not
attributed to a prompt.

Usage:
  python3 preserve_chats.py --staging <new_dir> --allowed-root <dir>
      [--projects-root ~/.cursor/projects] [--memory-dir <repo>/docs/project-memory]
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HOME = Path.home()
REPO = Path(__file__).resolve().parents[3]

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
COMPONENT_RE = re.compile(r"^[A-Za-z0-9._-]+$")
TS = re.compile(r"<timestamp>([^<]+)</timestamp>")
QUERY = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.S)
SYSTEM_PREFIXES = (
    "Briefly inform the user about the task result",
    "Perform any necessary follow-up actions in response to the subagent",
)
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# (class, pattern, replacement). Order matters: whole credentials before fragments.
TOKEN_CHARS = r"[A-Za-z0-9._\-]"
REDACT = [
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S), "[private key redacted]"),
    ("url_credentials", re.compile(r"\b[a-z][a-z0-9+.-]*://[^\s/:@]+:[^\s/@]+@[^\s'\"`)>]+", re.I), "[url-with-credentials redacted]"),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}(?:\.[A-Za-z0-9_\-]+)?"), "[token redacted]"),
    ("token", re.compile(
        r"\b(?:sk-proj-|sk-ant-|sk_live_|sk_test_|pk_live_|pk_test_|rk_live_|ghp_|gho_|ghs_|ghu_|github_pat_|"
        r"xox[abprs]-|whsec_|sb_secret_|sb_publishable_|sbp_|glpat-|shpat_)" + TOKEN_CHARS + r"{12,}"), "[token redacted]"),
    # Prefixes that also start ordinary words/identifiers: require a long mixed-case value with digits.
    ("token", re.compile(
        r"\b(?:sk-|re_|rnd_|npm_|EAA|AIza)(?=" + TOKEN_CHARS + r"*\d)(?=" + TOKEN_CHARS + r"*[A-Z])" + TOKEN_CHARS + r"{20,}"),
     "[token redacted]"),
    ("token", re.compile(r"\b(?:sk|pk)\.eyJ" + TOKEN_CHARS + r"{12,}"), "[token redacted]"),
    ("token", re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[token redacted]"),
    ("token", re.compile(r"\b(?:AC|SK)[0-9a-f]{32}\b"), "[token redacted]"),
    ("bearer", re.compile(r"(?i)\bbearer\s+" + TOKEN_CHARS + r"{16,}"), "Bearer [token redacted]"),
    ("secret_assignment", re.compile(
        r"(?i)\b([A-Z0-9_]*(?:PASSWORD|PASSWD|PWD|CONTRASEÑA|SECRET|TOKEN|API_?KEY|SERVICE_ROLE_KEY|PRIVATE_KEY|ACCESS_KEY|AUTH_KEY|DSN|DATABASE_URL)[A-Z0-9_]*)"
        r"(\s*[:=]\s*)(?![\[<{$(]|\*{3}|redacted|process\.|env\.|config\.|this\.|req\.|undefined|null\b|true\b|false\b)"
        r"(?![^\s\"'`,;]*\()[\"']?([^\s\"'`,;()]{6,})"),
     r"\1\2[secret redacted]"),
    ("high_entropy", re.compile(r"([=:]\s?)(?=[A-Za-z0-9+_\-]*[a-z])(?=[A-Za-z0-9+_\-]*[A-Z])(?=[A-Za-z0-9+_\-]*\d)[A-Za-z0-9+_\-]{32,}={0,2}"),
     r"\1[secret redacted]"),
    ("email", re.compile(r"(?<![\w.+-])(?!git@)[\w.+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]*[A-Za-z]"), "[email redacted]"),
    ("phone", re.compile(r"(?<![\w+])\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d){6,10}(?!\d)"), "[phone redacted]"),
    ("phone", re.compile(r"(?i)\b(celular|cel\.?|tel[eé]fono|tel\.?|whats?app|wsp|m[oó]vil|n[uú]mero)(\s*[:#]?\s*)(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b"), r"\1\2[phone redacted]"),
    ("id_number", re.compile(r"(?i)\b(C\.?I\.?|carnet|NIT)(\s*(?:N[°º]|nro\.?|:|#)\s*)\d{6,12}(?:\s?-?\s?[A-Z]{2})?\b"), r"\1\2[id number redacted]"),
    ("ip", re.compile(r"(?<![\w.:/-])(?!(?:10|127|0)\.)(?!192\.168\.)(?!172\.(?:1[6-9]|2\d|3[01])\.)(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\w.:/-])"), "[ip redacted]"),
]
# Residual risk reported for human review (line numbers only, never values).
REVIEW_PATTERNS = {
    "bare_7_10_digit_number": re.compile(r"(?<![\w.:/#-])\d{7,10}(?![\w.:/-])"),
    "hex_32plus_after_assignment": re.compile(r"[=:]\s?[0-9a-f]{32,}\b"),
    "personal_context_word": re.compile(r"(?i)\b(direcci[oó]n|calle|avenida|av\.|zona|barrio|domicilio|celular|tel[eé]fono|cliente|C\.?I\.?|NIT|carnet)\b"),
    "cca_rose_keyword": re.compile(r"(?i)\b(CCA|Rose|AuditEngine|AuditOS|SalesCore|cagteam)\b"),
}
CCA_TERMS = REVIEW_PATTERNS["cca_rose_keyword"]

MIXED_EXCERPTS = {
    "ddd43714-819a-4e7b-b12c-9f3e423f358b": ("Users-carmen-Projects-isalwa", [46, 53, 55, 59, 72, 76],
        "2026-10-01 Mac disk recovery (mostly CCA); ISALWA preservation-to-GitHub turns"),
    "69935342-a2f8-4d7c-91fe-13cc398ab8f3": ("empty-window", [191, 221],
        "Cursor operating environment / Twin OS (mostly CCA); portfolio-separation turns"),
}
# Reviewed by eye 2026-10-17. Excluded: ...2026-09-16_a_la_s__14.29.19-144441da-... (customer names and phone numbers).
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


class UnsafePath(Exception):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def redact(text: str) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}
    for cls, pattern, repl in REDACT:
        text, n = pattern.subn(repl, text)
        if n:
            counts[cls] = counts.get(cls, 0) + n
    return text, counts


def cca_dominant(text: str) -> bool:
    cca = len(CCA_TERMS.findall(text))
    return cca >= 3 and cca > text.lower().count("isalwa")


# ---------------------------------------------------------------- staging safety

def validate_staging(staging: Path, allowed_root: Path, forbidden: list[Path]) -> Path:
    if not staging.is_absolute() or not allowed_root.is_absolute():
        raise UnsafePath("staging and allowed root must be absolute paths")
    for part in staging.parts:
        if part in ("..", "."):
            raise UnsafePath("staging path must not contain '.' or '..'")
    if staging.exists() or staging.is_symlink():
        raise UnsafePath("staging directory already exists; choose a new directory")
    parent = staging.parent
    probe = parent
    while True:
        if probe.is_symlink():
            raise UnsafePath(f"symlink in staging path: {probe}")
        if probe == probe.parent:
            break
        probe = probe.parent
    if not parent.is_dir():
        raise UnsafePath("staging parent must be an existing directory")
    root = allowed_root.resolve(strict=True)
    resolved = parent.resolve(strict=True) / staging.name
    if not resolved.is_relative_to(root) or resolved == root:
        raise UnsafePath("staging must be a new directory inside the allowed root")
    for bad in forbidden:
        bad = bad.resolve() if bad.exists() else bad
        if resolved == bad or resolved.is_relative_to(bad):
            raise UnsafePath(f"staging must not be inside {bad}")
    if resolved in (Path("/"), HOME.resolve()):
        raise UnsafePath("staging must not be / or the home directory")
    return resolved


class Staging:
    """Write-once files under one root; no overwrite, no symlink following, no deletion."""

    def __init__(self, root: Path):
        self.root = root
        os.mkdir(root, 0o700)
        self.written: dict[str, list[str]] = {}

    def _target(self, area: str, rel: str) -> Path:
        rel_path = Path(rel)
        if rel_path.is_absolute() or any(p in ("..", ".", "") for p in rel_path.parts):
            raise UnsafePath(f"unsafe relative path: {rel!r}")
        target = self.root / area / rel_path
        current = self.root
        for part in (area, *rel_path.parts[:-1]):
            current = current / part
            if current.is_symlink():
                raise UnsafePath(f"symlink inside staging: {current}")
            if not current.exists():
                os.mkdir(current, 0o700)
        return target

    def write(self, area: str, rel: str, data: bytes) -> None:
        target = self._target(area, rel)
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        self.written.setdefault(area, []).append(rel)

    def rename_area(self, old: str, new: str) -> None:
        if (self.root / new).exists():
            raise UnsafePath(f"{new} already exists")
        os.rename(self.root / old, self.root / new)
        self.written[new] = self.written.pop(old, [])


def read_source(path: Path) -> bytes:
    if path.is_symlink():
        raise UnsafePath(f"source is a symlink: {path}")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, "rb") as fh:
        return fh.read()


# ---------------------------------------------------------------- transcripts

def text_of(event: dict) -> str:
    parts = event.get("message", {}).get("content", [])
    return "\n".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type") == "text").strip()


def segments(raw: bytes) -> tuple[list[dict], list[str]]:
    """Split a transcript into segments, one per user event.

    Each user event opens a segment; agent text until the next user event of any
    kind belongs to it. Prompt segments carry the prompt; repeated prompts are kept
    and marked; non-prompt segments (system/context) keep their agent text as
    ambiguous. Agent text before the first user event is ambiguous too.
    """
    out: list[dict] = []
    problems: list[str] = []
    first_seen: dict[str, int] = {}
    current = {"kind": "preamble", "line": 0, "stamp": "", "body": "", "replies": []}
    for lineno, line in enumerate(raw.decode("utf-8", errors="replace").splitlines(), 1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            problems.append(f"line {lineno}: not JSON")
            continue
        role = event.get("role")
        if role == "user":
            out.append(current)
            text = text_of(event)
            query = QUERY.search(text)
            body = query.group(1).strip() if query else ""
            stamp = TS.search(text)
            if not body:
                kind = "context"
            elif body.startswith(SYSTEM_PREFIXES):
                kind = "system"
            elif body in first_seen:
                kind = "repeated"
            else:
                kind = "prompt"
                first_seen[body] = lineno
            current = {"kind": kind, "line": lineno, "stamp": stamp.group(1).strip() if stamp else "",
                       "body": body, "raw": text, "replies": [],
                       "repeat_of": first_seen.get(body) if kind == "repeated" else None}
        elif role == "assistant":
            reply = text_of(event)
            if reply:
                current["replies"].append(reply)
    out.append(current)
    return [s for s in out if s["kind"] != "preamble" or s["replies"]], problems


def month_of(stamp: str) -> str | None:
    m = re.search(r"(\w{3}) \d{1,2}, (\d{4})", stamp)
    if not m or m.group(1) not in MONTHS:
        return None
    return f"{m.group(2)}-{MONTHS.index(m.group(1)) + 1:02d}"


def fence(text: str) -> str:
    longest = max((len(m) for m in re.findall(r"`+", text)), default=0)
    return "`" * max(4, longest + 1)


class Recorder:
    def __init__(self) -> None:
        self.original_hashes: list[list[str]] = []
        self.omissions: list[list[str]] = []

    def block(self, chat: str, line: int, label: str, body: str) -> tuple[str, int]:
        self.original_hashes.append([chat, str(line), label, sha256(body.encode())])
        clean, counts = redact(body)
        for cls, n in counts.items():
            self.omissions.append([chat, str(line), label, "redacted", cls, str(n)])
        f = fence(clean)
        note = f" · redactions: {', '.join(f'{k} {v}' for k, v in sorted(counts.items()))}" if counts else ""
        return f"**{label}**{note}\n\n{f}text\n{clean}\n{f}\n\n", sum(counts.values())

    def withhold(self, chat: str, line: int, label: str, reason: str) -> str:
        self.omissions.append([chat, str(line), label, "withheld", reason, "1"])
        return f"**{label}** — withheld from this payload ({reason}); the source chat stays on hold.\n\n"


# ---------------------------------------------------------------- main build

def load_csv(path: Path) -> list[dict]:
    with path.open(newline="") as fh:
        return list(csv.DictReader(fh))


def memory_files(memory_dir: Path) -> list[str]:
    try:
        out = subprocess.run(["git", "-C", str(memory_dir), "ls-files", "--", "."],
                             capture_output=True, text=True, check=True).stdout.split("\n")
        files = [f for f in out if f]
    except (subprocess.CalledProcessError, FileNotFoundError):
        files = []
    if not files:
        files = sorted(str(p.relative_to(memory_dir)) for p in memory_dir.rglob("*") if p.is_file() and not p.is_symlink())
    return [f for f in files if "__pycache__" not in f]


def sanitize_memory_file(rel: str, data: bytes) -> tuple[bytes, dict[str, int]]:
    if rel.endswith(".csv"):
        reader = csv.reader(io.StringIO(data.decode("utf-8", errors="replace")))
        rows = list(reader)
        if rows and "sha256_16" in rows[0]:
            drop = rows[0].index("sha256_16")
            rows = [r[:drop] + r[drop + 1:] for r in rows]
        buf = io.StringIO()
        csv.writer(buf).writerows(rows)
        text = buf.getvalue()
    else:
        text = data.decode("utf-8", errors="replace")
    clean, counts = redact(text)
    if counts and "sha256 (original" in clean:
        clean = re.sub(r"`[0-9a-f]{64}`", "`[hash omitted]`", clean)
    return clean.encode(), counts


def build(staging_path: Path, allowed_root: Path, projects_root: Path, memory_dir: Path) -> int:
    forbidden = [HOME / ".cursor", HOME / "Library", REPO, projects_root, memory_dir]
    root = validate_staging(staging_path, allowed_root, forbidden)
    st = Staging(root)
    rec = Recorder()
    errors: list[list[str]] = []
    coverage: list[list[str]] = []
    area = ".payload.partial"

    def err(item: str, problem: str) -> None:
        errors.append([item, problem])

    try:
        readiness = load_csv(memory_dir / "chats/DELETION_READINESS.csv")
        index = {r["chat_id"]: r for r in load_csv(memory_dir / "chats/CHAT_INDEX.csv")}
        turn_rows = load_csv(memory_dir / "chats/USER_TURN_COVERAGE.csv")
        attach_rows = load_csv(memory_dir / "attachments/CHAT_ATTACHMENT_REFERENCES.csv")
    except (OSError, KeyError, csv.Error) as exc:
        readiness, index, turn_rows, attach_rows = [], {}, [], []
        err("index", f"cannot read index CSVs: {type(exc).__name__}")

    expected_turns: dict[str, set[str]] = {}
    for r in turn_rows:
        expected_turns.setdefault(r.get("chat_id", ""), set()).add(r.get("sha256_16", ""))
    cleared = {(p, n) for p, names in ATTACHMENTS_CLEARED.items() for n in names}
    copied_assets: set[tuple[str, str]] = set()
    for project, names in ATTACHMENTS_CLEARED.items():
        for name in names:
            try:
                if not COMPONENT_RE.match(project) or not COMPONENT_RE.match(name):
                    raise UnsafePath("invalid attachment path component")
                st.write(area, f"attachments/{name}", read_source(projects_root / project / "assets" / name))
                copied_assets.add((project, name))
            except (OSError, UnsafePath) as exc:
                err(f"attachment {name}", f"not copied: {type(exc).__name__}")

    for row in readiness:
        chat_id, project, status = row.get("chat_id", ""), row.get("cursor_project", ""), row.get("status", "")
        if status == "HOLD_ACTIVE":
            continue
        problems: list[str] = []
        omitted = 0
        if not UUID_RE.match(chat_id) or not COMPONENT_RE.match(project) or project in (".", ".."):
            err(f"chat {chat_id!r}", "invalid chat id or project component")
            coverage.append([chat_id, project, "INCOMPLETE", "", "", "", "", "", "invalid id"])
            continue
        if chat_id not in index:
            problems.append("chat missing from CHAT_INDEX")
        main_path = projects_root / project / "agent-transcripts" / chat_id / f"{chat_id}.jsonl"
        try:
            raw = read_source(main_path)
        except (OSError, UnsafePath) as exc:
            err(f"chat {chat_id}", f"transcript not readable: {type(exc).__name__}")
            coverage.append([chat_id, project, "INCOMPLETE", "", "", "", "", "", "transcript missing"])
            continue
        segs, parse_problems = segments(raw)
        problems += parse_problems
        title, _ = redact(index.get(chat_id, {}).get("first_line_redacted", ""))
        parts = [
            f"# Chat `{chat_id}`\n\n| field | value |\n|---|---|\n| title (first line) | {title.replace('|', '/')} |\n"
            f"| Cursor project | `{project}` |\n| first | {row.get('first_timestamp', '')} |\n| last | {row.get('last_timestamp', '')} |\n\n",
            "Redacted (regex), NOT REVIEWED. User turns: Carmen, or text she relayed (relayed customer words are not "
            "separately marked). Agent text: the agent's text replies after each user event, in order. Intermediate tool "
            "calls and tool results are not preserved.\n\n",
        ]
        produced: set[str] = set()
        for seg in segs:
            kind, line = seg["kind"], seg["line"]
            if kind == "prompt":
                produced.add(sha256(seg["body"].encode())[:16])
                parts.append(f"---\n\n## Prompt — {seg['stamp'] or 'no timestamp'} — line {line}\n\n")
                if cca_dominant(seg["body"]):
                    parts.append(rec.withhold(chat_id, line, "User", "CCA/Rose content, not ISALWA"))
                    for i, _ in enumerate(seg["replies"], 1):
                        parts.append(rec.withhold(chat_id, line, f"Agent reply {i}", "follows withheld CCA/Rose prompt"))
                    omitted += 1 + len(seg["replies"])
                    continue
                text, n = rec.block(chat_id, line, "User", seg["body"])
                parts.append(text)
                omitted += n
            elif kind == "repeated":
                parts.append(f"---\n\n## Repeated prompt — {seg['stamp'] or 'no timestamp'} — line {line}\n\n"
                             f"Same text as the prompt at line {seg['repeat_of']}.\n\n")
            elif seg["replies"]:
                parts.append(f"---\n\n## Agent text after a {kind} event — line {line} (boundary ambiguous; not attributed to a prompt)\n\n")
            for i, reply in enumerate(seg["replies"], 1):
                text, n = rec.block(chat_id, line, f"Agent reply {i}", reply)
                parts.append(text)
                omitted += n
        missing = sorted(expected_turns.get(chat_id, set()) - produced)
        extra = sorted(produced - expected_turns.get(chat_id, set()))
        for h in missing:
            problems.append(f"indexed prompt not produced (index hash {h})")
        for h in extra:
            problems.append(f"produced prompt not in index (hash {h})")

        sub_dir = main_path.parent / "subagents"
        subs = sorted(p for p in sub_dir.glob("*.jsonl") if not p.is_symlink()) if sub_dir.is_dir() else []
        expected_subs = int(index.get(chat_id, {}).get("subagent_transcripts", "0") or 0)
        complete_subs = 0
        for sub in subs:
            parts.append(f"---\n\n## Subagent `{sub.stem}`\n\n")
            try:
                sub_segs, sub_problems = segments(read_source(sub))
            except (OSError, UnsafePath) as exc:
                problems.append(f"subagent {sub.stem} not readable: {type(exc).__name__}")
                continue
            problems += [f"subagent {sub.stem}: {p}" for p in sub_problems]
            first_user = next((s for s in sub_segs if s["kind"] != "preamble"), None)
            task = (first_user["body"] or first_user["raw"]).strip() if first_user else ""
            replies = [r for s in sub_segs for r in s["replies"]]
            if task:
                text, n = rec.block(chat_id, 0, f"Subagent {sub.stem} task", task)
                parts.append(text)
                omitted += n
            if replies:
                text, n = rec.block(chat_id, 0, f"Subagent {sub.stem} final report", replies[-1])
                parts.append(text)
                omitted += n
            if task and replies:
                complete_subs += 1
            else:
                problems.append(f"subagent {sub.stem}: {'no task text' if not task else 'no report text'}")
        if len(subs) != expected_subs:
            problems.append(f"subagent files found {len(subs)}, index expects {expected_subs}")

        refs = [r for r in attach_rows if r.get("chat_id") == chat_id]
        expected_assets = {(Path(r["absolute_path_as_written"]).parts[-3], Path(r["absolute_path_as_written"]).name)
                           for r in refs if "/assets/" in r.get("absolute_path_as_written", "")}
        attach_problems = []
        for asset in sorted(expected_assets):
            project_key = next((p for p in ATTACHMENTS_CLEARED if p.lower() == asset[0].lower()), asset[0])
            key = (project_key, asset[1])
            if key not in cleared:
                attach_problems.append(f"screenshot {asset[1][:40]}… not cleared for the payload")
            elif key not in copied_assets:
                attach_problems.append(f"screenshot {asset[1][:40]}… cleared but not copied")
        other_refs = sorted({r.get("filename", "") for r in refs if "/assets/" not in r.get("absolute_path_as_written", "")})

        month = month_of(row.get("first_timestamp", ""))
        if month is None:
            problems.append("first timestamp has no recognizable month")
            month = "undated"
        parts.append("---\n\n## Coverage (measured)\n\n"
                     f"- indexed prompts {len(expected_turns.get(chat_id, set()))}, produced {len(produced)}, missing {len(missing)}, extra {len(extra)}\n"
                     f"- subagents indexed {expected_subs}, found {len(subs)}, with task and report {complete_subs}\n"
                     f"- screenshots referenced {len(expected_assets)}, problems {len(attach_problems)}\n"
                     f"- referenced files not held in the chat (unresolved, non-blocking): {', '.join(other_refs) or 'none'}\n"
                     f"- omissions (redacted or withheld blocks): {omitted}\n")
        try:
            st.write(area, f"chats/{month}/{chat_id}.md", "".join(parts).encode())
        except (OSError, UnsafePath) as exc:
            problems.append(f"chat file not written: {type(exc).__name__}")
        blocking = problems + attach_problems
        state = "INCOMPLETE" if blocking else ("PRESERVED_WITH_OMISSIONS" if omitted else "PRESERVED_LOSSLESS")
        for p in blocking:
            err(f"chat {chat_id}", p)
        coverage.append([chat_id, project, state, str(len(expected_turns.get(chat_id, set()))), str(len(produced)),
                         str(expected_subs), str(complete_subs), str(omitted), "; ".join(blocking)])

    for chat_id, (project, lines, note) in MIXED_EXCERPTS.items():
        path = projects_root / project / "agent-transcripts" / chat_id / f"{chat_id}.jsonl"
        try:
            segs, _ = segments(read_source(path))
        except (OSError, UnsafePath) as exc:
            err(f"mixed {chat_id}", f"transcript not readable: {type(exc).__name__}")
            continue
        found = {s["line"]: s for s in segs if s["kind"] == "prompt"}
        parts = [f"# ISALWA excerpts from mixed chat `{chat_id}`\n\n{note}. The rest of the chat is CCA work and is not "
                 "included; the chat stays out of the ISALWA deletion list.\n\n"]
        for line in lines:
            seg = found.get(line)
            if seg is None:
                err(f"mixed {chat_id}", f"listed line {line} is not a prompt")
                continue
            parts.append(f"---\n\n## {seg['stamp']} — line {line}\n\n")
            parts.append(rec.block(chat_id, line, "User", seg["body"])[0])
            for i, reply in enumerate(seg["replies"], 1):
                parts.append(rec.block(chat_id, line, f"Agent reply {i}", reply)[0])
        try:
            st.write(area, f"mixed/{chat_id}-isalwa-excerpts.md", "".join(parts).encode())
        except (OSError, UnsafePath) as exc:
            err(f"mixed {chat_id}", f"not written: {type(exc).__name__}")

    for rel in memory_files(memory_dir):
        try:
            data, counts = sanitize_memory_file(rel, read_source(memory_dir / rel))
            st.write(area, f"project-memory/{rel}", data)
            for cls, n in counts.items():
                rec.omissions.append([f"project-memory/{rel}", "", "file", "redacted", cls, str(n)])
        except (OSError, UnsafePath, UnicodeError) as exc:
            err(f"project-memory {rel}", f"not copied: {type(exc).__name__}")

    complete = not errors and bool(readiness)
    status = "COMPLETE" if complete else "INCOMPLETE"
    review_rows: list[list[str]] = []
    for rel in sorted(st.written.get(area, [])):
        if rel.startswith("attachments/"):
            continue
        text = (root / area / rel).read_text(errors="replace").splitlines()
        for name, pattern in REVIEW_PATTERNS.items():
            hits = [str(i) for i, line in enumerate(text, 1) if pattern.search(line)]
            if hits:
                review_rows.append([rel, name, str(len(hits)), " ".join(hits[:200])])
    review_rows.append(["(all files)", "names_businesses_addresses", "", "not machine-detectable: human review of the payload required"])

    def csv_bytes(header: list[str], rows: list[list[str]]) -> bytes:
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(header)
        w.writerows(rows)
        return buf.getvalue().encode()

    states: dict[str, int] = {}
    for c in coverage:
        states[c[2]] = states.get(c[2], 0) + 1
    st.write(area, "COVERAGE.csv", csv_bytes(
        ["chat_id", "cursor_project", "state", "indexed_prompts", "produced_prompts", "indexed_subagents",
         "subagents_with_task_and_report", "omitted_blocks", "problems"], coverage))
    st.write(area, "COVERAGE.md", (
        f"# Coverage — {status}\n\n" + "".join(f"- {k}: {v}\n" for k, v in sorted(states.items())) +
        f"- run errors: {len(errors)}\n\n" + "".join(f"- `{e[0]}`: {e[1]}\n" for e in errors)).encode())
    st.write(area, "STATUS.json", json.dumps({
        "status": status, "backup_ready": False,
        "sanitization": "redacted (regex), NOT REVIEWED", "chat_states": states, "errors": len(errors),
        "note": "backup_ready stays false until a human review of this payload is recorded; INCOMPLETE never clears deletion",
    }, indent=2).encode())
    st.write(area, "README.md", (
        "# ISALWA chat-preservation payload\n\n"
        "Redacted by regex and NOT REVIEWED. Do not transfer until a human review of this payload is recorded.\n"
        "Chats marked PRESERVED_WITH_OMISSIONS or INCOMPLETE in COVERAGE.csv stay on hold.\n"
        "project-memory/ holds redacted copies of the committed archive files (hash column of USER_TURN_COVERAGE.csv dropped).\n"
        "MANIFEST.sha256 covers exactly the files written to this payload, excluding itself.\n").encode())
    manifest = "".join(f"{sha256((root / area / rel).read_bytes())}  {rel}\n" for rel in sorted(st.written[area]))
    st.write(area, "MANIFEST.sha256", manifest.encode())
    st.write("local-restricted", "ORIGINAL_HASHES.csv", csv_bytes(["chat_id", "line", "block", "sha256_original"], rec.original_hashes))
    st.write("local-restricted", "OMISSIONS.csv", csv_bytes(["location", "line", "block", "kind", "class", "count"], rec.omissions))
    st.write("review", "REVIEW_REQUIRED.csv", csv_bytes(["payload_file", "check", "lines_hit", "line_numbers_or_note"], review_rows))
    st.rename_area(area, "payload" if complete else "payload.INCOMPLETE")
    print(f"status={status} chats={len(coverage)} states={states} errors={len(errors)} payload_files={len(st.written['payload' if complete else 'payload.INCOMPLETE'])}")
    return 0 if complete else 2


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--staging", required=True, type=Path)
    ap.add_argument("--allowed-root", required=True, type=Path)
    ap.add_argument("--projects-root", type=Path, default=HOME / ".cursor/projects")
    ap.add_argument("--memory-dir", type=Path, default=REPO / "docs/project-memory")
    args = ap.parse_args(argv)
    try:
        return build(args.staging, args.allowed_root, args.projects_root, args.memory_dir)
    except UnsafePath as exc:
        print(f"refused: {exc}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
