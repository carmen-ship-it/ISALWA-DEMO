#!/usr/bin/env python3
"""Synthetic-fixture tests for preserve_chats.py. No real chat source is read.

Run: python3 -B docs/project-memory/tools/test_preserve_chats.py
"""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("preserve_chats", HERE / "preserve_chats.py")
pc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pc)

CHAT_A = "11111111-1111-4111-8111-111111111111"
CHAT_B = "22222222-2222-4222-8222-222222222222"
PROJECT = "Users-test-isalwa"
ASSET = "Captura_test-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png"
SECRET_TEXT = "Use key sk-proj-AbC123_def.456-GHIjkl789 and email ana@example.com, celular 71234567."


def user(text: str, stamp: str = "Saturday, Sep 12, 2026, 10:00 AM (UTC-4)") -> str:
    return json.dumps({"role": "user", "message": {"content": [
        {"type": "text", "text": f"<timestamp>{stamp}</timestamp>\n<user_query>\n{text}\n</user_query>"}]}})


def context(text: str) -> str:
    return json.dumps({"role": "user", "message": {"content": [{"type": "text", "text": text}]}})


def agent(text: str) -> str:
    return json.dumps({"role": "assistant", "message": {"content": [{"type": "text", "text": text}]}})


def h16(body: str) -> str:
    return hashlib.sha256(body.strip().encode()).hexdigest()[:16]


class Fixture:
    def __init__(self, root: Path, *, chat_a_lines: list[str] | None = None, index_extra_turn: bool = False,
                 drop_transcript_b: bool = False, empty_subagent_report: bool = False):
        self.root = root
        self.projects = root / "projects"
        self.memory = root / "memory"
        self.allowed = root / "staging-root"
        self.allowed.mkdir()
        tdir = self.projects / PROJECT / "agent-transcripts"
        a_lines = chat_a_lines or [
            agent("preamble text"),
            user("First prompt about ISALWA catalog"),
            agent("progress note"),
            agent("Final answer to first prompt"),
            context("<system_reminder>tool catalog</system_reminder>"),
            agent("Text after a context event"),
            user("continúa"),
            agent("Answer to first continúa"),
            user("continúa"),
            agent("Answer to repeated continúa"),
            user("Briefly inform the user about the task result and perform any follow-up actions"),
            agent("Notification answer"),
            user(SECRET_TEXT),
            agent("Done on 2026-10-17 10:25; chat 69935342-a2f8-4d7c-91fe-13cc398ab8f3 and commit 2dc2745b5f99981997eb66f3c038a594cf1c15b8."),
        ]
        (tdir / CHAT_A / "subagents").mkdir(parents=True)
        (tdir / CHAT_A / f"{CHAT_A}.jsonl").write_text("\n".join(a_lines) + "\n")
        (tdir / CHAT_A / "subagents" / "sub1.jsonl").write_text(
            "\n".join([context("Subagent task: inspect files"), agent("" if empty_subagent_report else "Subagent report")]) + "\n")
        (tdir / CHAT_B).mkdir(parents=True)
        if not drop_transcript_b:
            (tdir / CHAT_B / f"{CHAT_B}.jsonl").write_text("\n".join([
                user("Rose asked CCA to update AuditEngine for CCA and Rose again"),
                agent("CCA answer"),
                user("ISALWA second prompt"),
                agent("ISALWA answer"),
            ]) + "\n")
        (self.projects / PROJECT / "assets").mkdir(parents=True)
        (self.projects / PROJECT / "assets" / ASSET).write_bytes(b"\x89PNG fake")

        bodies_a = ["First prompt about ISALWA catalog", "continúa", SECRET_TEXT]
        bodies_b = ["Rose asked CCA to update AuditEngine for CCA and Rose again", "ISALWA second prompt"]
        (self.memory / "chats").mkdir(parents=True)
        (self.memory / "attachments").mkdir(parents=True)
        self._csv("chats/DELETION_READINESS.csv",
                  ["chat_id", "cursor_project", "first_timestamp", "last_timestamp", "status", "reason", "preserved_at"],
                  [[CHAT_A, PROJECT, "Saturday, Sep 12, 2026, 10:00 AM (UTC-4)", "", "NOT_READY", "", ""],
                   [CHAT_B, PROJECT, "Sunday, Sep 13, 2026, 10:00 AM (UTC-4)", "", "NOT_READY", "", ""],
                   ["33333333-3333-4333-8333-333333333333", PROJECT, "", "", "HOLD_ACTIVE", "", ""]])
        self._csv("chats/CHAT_INDEX.csv", ["chat_id", "subagent_transcripts", "first_line_redacted"],
                  [[CHAT_A, "1", "First prompt"], [CHAT_B, "0", "Rose asked"]])
        turns = [[CHAT_A, "", "", "", "no", "", h16(b)] for b in bodies_a] + [[CHAT_B, "", "", "", "no", "", h16(b)] for b in bodies_b]
        if index_extra_turn:
            turns.append([CHAT_A, "", "", "", "no", "", "deadbeefdeadbeef"])
        self._csv("chats/USER_TURN_COVERAGE.csv",
                  ["chat_id", "jsonl_line", "timestamp", "chars", "preserved_verbatim", "preserved_at", "sha256_16"], turns)
        self._csv("attachments/CHAT_ATTACHMENT_REFERENCES.csv",
                  ["chat_id", "cursor_project", "jsonl_line", "timestamp", "filename", "absolute_path_as_written"],
                  [[CHAT_A, PROJECT, "2", "", ASSET, f"/Users/test/.cursor/projects/{PROJECT}/assets/{ASSET}"]])
        (self.memory / "NOTES.md").write_text("Contact maria@example.org. Dates 2026-10-17 stay.\n")

    def _csv(self, rel: str, header: list[str], rows: list[list[str]]) -> None:
        with (self.memory / rel).open("w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(header)
            w.writerows(rows)

    def run(self, name: str = "bundle") -> tuple[int, Path]:
        staging = self.allowed / name
        code = pc.main(["--staging", str(staging), "--allowed-root", str(self.allowed),
                        "--projects-root", str(self.projects), "--memory-dir", str(self.memory)])
        return code, staging


class PreserveChatsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp()).resolve()
        pc.MIXED_EXCERPTS = {}
        pc.ATTACHMENTS_CLEARED = {PROJECT: [ASSET]}

    def payload_text(self, staging: Path, area: str = "payload") -> str:
        return "\n".join(p.read_text(errors="replace") for p in (staging / area).rglob("*") if p.is_file() and p.suffix != ".png")

    # ---------------------------------------------------------------- attribution

    def test_attribution_keeps_ambiguous_boundaries_and_repeats(self) -> None:
        segs, problems = pc.segments((Fixture(self.tmp).projects / PROJECT / "agent-transcripts" / CHAT_A / f"{CHAT_A}.jsonl").read_bytes())
        self.assertEqual(problems, [])
        kinds = [(s["kind"], s["replies"]) for s in segs]
        self.assertEqual(kinds[0], ("preamble", ["preamble text"]))
        self.assertEqual(kinds[1], ("prompt", ["progress note", "Final answer to first prompt"]))
        self.assertEqual(kinds[2], ("context", ["Text after a context event"]))
        self.assertEqual(kinds[3], ("prompt", ["Answer to first continúa"]))
        self.assertEqual(kinds[4][0], "repeated")
        self.assertEqual(kinds[4][1], ["Answer to repeated continúa"])
        self.assertEqual(segs[4]["repeat_of"], segs[3]["line"])
        self.assertEqual(kinds[5], ("system", ["Notification answer"]))

    def test_chat_file_marks_ambiguous_text(self) -> None:
        code, staging = Fixture(self.tmp).run()
        self.assertEqual(code, 0, (staging / "payload" / "COVERAGE.md").read_text() if (staging / "payload").exists() else "")
        text = (staging / "payload/chats/2026-09" / f"{CHAT_A}.md").read_text()
        self.assertIn("Agent text after a context event", text)
        self.assertIn("boundary ambiguous; not attributed to a prompt", text)
        self.assertIn("Repeated prompt", text)
        self.assertIn("Answer to repeated continúa", text)

    # ---------------------------------------------------------------- redaction

    def test_redaction_covers_credentials_and_contacts_without_corrupting_ids(self) -> None:
        sample = "\n".join([
            "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.abc_DEF-123",
            "openai sk-proj-AbC123_def.456-GHIjkl789",
            "meta EAAGm0PX4ZCpsBAKZCZBabc123DEFghiJKL",
            "supabase sb_secret_abcdefghijklmnop1234",
            "aws AKIAABCDEFGHIJKLMNOP",
            "twilio AC0123456789abcdef0123456789abcdef",
            "SERVICE_ROLE_KEY=abcdef123456",
            "db postgres://user:pa55@db.example.com:5432/app",
            "-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----",
            "mail ana@example.com, git@github.com:org/repo.git",
            "wa +591 71234567, celular 71234567, CI: 1234567 SC, NIT: 123456789",
            "server 18.225.67.55, local 192.168.1.2",
            "keep 2026-10-17 10:25 and 2026-10-17T10:25:00Z",
            "keep chat 69935342-a2f8-4d7c-91fe-13cc398ab8f3 and prefix `69935342`",
            "keep commit 2dc2745b5f99981997eb66f3c038a594cf1c15b8",
            "keep code const token = createId(); re_assignment_history_table",
        ])
        out, counts = pc.redact(sample)
        for leaked in ["IUzI1NiJ9", "AbC123_def", "EAAGm0PX4", "sb_secret_abc", "AKIAABCD", "AC0123456789abcdef",
                       "abcdef123456", "pa55", "MIIabc", "ana@example.com", "71234567", "1234567 SC", "123456789", "18.225.67.55"]:
            self.assertNotIn(leaked, out, leaked)
        for kept in ["git@github.com", "192.168.1.2", "2026-10-17 10:25", "2026-10-17T10:25:00Z",
                     "69935342-a2f8-4d7c-91fe-13cc398ab8f3", "`69935342`", "2dc2745b5f99981997eb66f3c038a594cf1c15b8",
                     "const token = createId()", "re_assignment_history_table"]:
            self.assertIn(kept, out, kept)
        self.assertGreaterEqual(counts.get("phone", 0), 2)

    def test_no_original_hash_in_payload_and_restricted_record_kept_local(self) -> None:
        code, staging = Fixture(self.tmp).run()
        self.assertEqual(code, 0)
        original = hashlib.sha256(SECRET_TEXT.encode()).hexdigest()
        self.assertNotIn(original, self.payload_text(staging))
        self.assertNotIn(original[:16], self.payload_text(staging))
        self.assertIn(original, (staging / "local-restricted/ORIGINAL_HASHES.csv").read_text())
        self.assertNotIn("sha256_16", (staging / "payload/project-memory/chats/USER_TURN_COVERAGE.csv").read_text())

    def test_project_memory_copies_are_redacted(self) -> None:
        code, staging = Fixture(self.tmp).run()
        notes = (staging / "payload/project-memory/NOTES.md").read_text()
        self.assertNotIn("maria@example.org", notes)
        self.assertIn("2026-10-17", notes)

    def test_cca_prompt_withheld_and_chat_kept_on_hold(self) -> None:
        code, staging = Fixture(self.tmp).run()
        self.assertEqual(code, 0)
        text = (staging / "payload/chats/2026-09" / f"{CHAT_B}.md").read_text()
        self.assertNotIn("AuditEngine", text)
        self.assertNotIn("CCA answer", text)
        self.assertIn("ISALWA answer", text)
        with (staging / "payload/COVERAGE.csv").open() as fh:
            rows = {r["chat_id"]: r for r in csv.DictReader(fh)}
        self.assertEqual(rows[CHAT_B]["state"], "PRESERVED_WITH_OMISSIONS")
        self.assertEqual(rows[CHAT_A]["state"], "PRESERVED_WITH_OMISSIONS")  # redactions are omissions too

    def test_chat_without_omissions_is_lossless(self) -> None:
        fx = Fixture(self.tmp)
        lines = [user("First prompt about ISALWA catalog"), agent("Answer"), user("continúa"), agent("ok"),
                 user(SECRET_TEXT.replace("sk-proj-AbC123_def.456-GHIjkl789", "the key").replace("ana@example.com", "Ana")
                      .replace(", celular 71234567", ""))]
        (fx.projects / PROJECT / "agent-transcripts" / CHAT_A / f"{CHAT_A}.jsonl").write_text("\n".join(lines) + "\n")
        clean_body = SECRET_TEXT.replace("sk-proj-AbC123_def.456-GHIjkl789", "the key").replace("ana@example.com", "Ana").replace(", celular 71234567", "")
        bodies = ["First prompt about ISALWA catalog", "continúa", clean_body]
        with (fx.memory / "chats/USER_TURN_COVERAGE.csv").open("w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["chat_id", "jsonl_line", "timestamp", "chars", "preserved_verbatim", "preserved_at", "sha256_16"])
            w.writerows([[CHAT_A, "", "", "", "no", "", h16(b)] for b in bodies])
            w.writerows([[CHAT_B, "", "", "", "no", "", h16(b)] for b in ["Rose asked CCA to update AuditEngine for CCA and Rose again", "ISALWA second prompt"]])
        code, staging = fx.run()
        self.assertEqual(code, 0)
        with (staging / "payload/COVERAGE.csv").open() as fh:
            rows = {r["chat_id"]: r for r in csv.DictReader(fh)}
        self.assertEqual(rows[CHAT_A]["state"], "PRESERVED_LOSSLESS")
        self.assertEqual(rows[CHAT_A]["omitted_blocks"], "0")

    def test_review_list_has_no_values(self) -> None:
        code, staging = Fixture(self.tmp).run()
        review = (staging / "review/REVIEW_REQUIRED.csv").read_text()
        self.assertIn("names_businesses_addresses", review)
        for value in ["71234567", "ana@example.com", "sk-proj"]:
            self.assertNotIn(value, review)
        status = json.loads((staging / "payload/STATUS.json").read_text())
        self.assertFalse(status["backup_ready"])
        self.assertEqual(status["sanitization"], "redacted (regex), NOT REVIEWED")

    # ---------------------------------------------------------------- path safety

    def test_existing_staging_refused_and_untouched(self) -> None:
        fx = Fixture(self.tmp)
        existing = fx.allowed / "bundle"
        existing.mkdir()
        (existing / "keep.txt").write_text("keep")
        code, _ = fx.run("bundle")
        self.assertEqual(code, 3)
        self.assertEqual((existing / "keep.txt").read_text(), "keep")
        self.assertEqual(sorted(p.name for p in existing.iterdir()), ["keep.txt"])

    def test_symlinked_parent_refused(self) -> None:
        fx = Fixture(self.tmp)
        real = fx.allowed / "real"
        real.mkdir()
        os.symlink(real, fx.allowed / "link")
        with self.assertRaises(pc.UnsafePath):
            pc.validate_staging(fx.allowed / "link" / "bundle", fx.allowed, [])
        self.assertEqual(list(real.iterdir()), [])

    def test_outside_allowed_root_and_forbidden_roots_refused(self) -> None:
        fx = Fixture(self.tmp)
        with self.assertRaises(pc.UnsafePath):
            pc.validate_staging(self.tmp / "elsewhere", fx.allowed, [])
        with self.assertRaises(pc.UnsafePath):
            pc.validate_staging(fx.allowed / "x", fx.allowed, [fx.allowed])
        with self.assertRaises(pc.UnsafePath):
            pc.validate_staging(fx.allowed / ".." / "x", fx.allowed, [])
        with self.assertRaises(pc.UnsafePath):
            pc.validate_staging(Path("relative/x"), fx.allowed, [])
        self.assertFalse((Path.home() / ".cursor" / "never-created-by-test").exists())

    def test_write_once_and_traversal_refused(self) -> None:
        root = self.tmp / "st"
        st = pc.Staging(root)
        st.write("payload", "a/b.txt", b"1")
        with self.assertRaises(FileExistsError):
            st.write("payload", "a/b.txt", b"2")
        self.assertEqual((root / "payload/a/b.txt").read_bytes(), b"1")
        for bad in ["../x", "/etc/x", "a/../../x"]:
            with self.assertRaises(pc.UnsafePath):
                st.write("payload", bad, b"x")

    def test_symlinked_source_not_followed(self) -> None:
        fx = Fixture(self.tmp)
        target = self.tmp / "outside-secret.txt"
        target.write_text("secret")
        asset = fx.projects / PROJECT / "assets" / ASSET
        asset.unlink()
        os.symlink(target, asset)
        code, staging = fx.run()
        self.assertEqual(code, 2)
        self.assertFalse((staging / "payload.INCOMPLETE/attachments" / ASSET).exists())

    def test_invalid_chat_id_rejected(self) -> None:
        fx = Fixture(self.tmp)
        with (fx.memory / "chats/DELETION_READINESS.csv").open() as fh:
            rows = list(csv.reader(fh))
        rows.append(["../../etc", PROJECT, "", "", "NOT_READY", "", ""])
        with (fx.memory / "chats/DELETION_READINESS.csv").open("w", newline="") as fh:
            csv.writer(fh).writerows(rows)
        code, staging = fx.run()
        self.assertEqual(code, 2)
        self.assertIn("invalid chat id", (staging / "payload.INCOMPLETE/COVERAGE.md").read_text())

    # ---------------------------------------------------------------- failure and coverage

    def test_missing_transcript_gives_incomplete_with_itemized_error(self) -> None:
        code, staging = Fixture(self.tmp, drop_transcript_b=True).run()
        self.assertEqual(code, 2)
        self.assertFalse((staging / "payload").exists())
        cov = (staging / "payload.INCOMPLETE/COVERAGE.md").read_text()
        self.assertIn("# Coverage — INCOMPLETE", cov)
        self.assertIn(CHAT_B, cov)
        self.assertIn("transcript not readable", cov)
        status = json.loads((staging / "payload.INCOMPLETE/STATUS.json").read_text())
        self.assertEqual(status["status"], "INCOMPLETE")

    def test_index_mismatch_is_listed_not_hidden(self) -> None:
        code, staging = Fixture(self.tmp, index_extra_turn=True).run()
        self.assertEqual(code, 2)
        cov = (staging / "payload.INCOMPLETE/COVERAGE.md").read_text()
        self.assertIn("indexed prompt not produced (index hash deadbeefdeadbeef)", cov)

    def test_empty_subagent_report_is_listed(self) -> None:
        code, staging = Fixture(self.tmp, empty_subagent_report=True).run()
        self.assertEqual(code, 2)
        self.assertIn("subagent sub1: no report text", (staging / "payload.INCOMPLETE/COVERAGE.md").read_text())

    def test_uncleared_screenshot_blocks_chat(self) -> None:
        pc.ATTACHMENTS_CLEARED = {}
        code, staging = Fixture(self.tmp).run()
        self.assertEqual(code, 2)
        with (staging / "payload.INCOMPLETE/COVERAGE.csv").open() as fh:
            rows = {r["chat_id"]: r for r in csv.DictReader(fh)}
        self.assertEqual(rows[CHAT_A]["state"], "INCOMPLETE")
        self.assertIn("not cleared", rows[CHAT_A]["problems"])

    def test_manifest_covers_exactly_payload_files(self) -> None:
        code, staging = Fixture(self.tmp).run()
        self.assertEqual(code, 0)
        payload = staging / "payload"
        lines = (payload / "MANIFEST.sha256").read_text().splitlines()
        listed = {line.split("  ", 1)[1]: line.split("  ", 1)[0] for line in lines}
        actual = {str(p.relative_to(payload)) for p in payload.rglob("*") if p.is_file()} - {"MANIFEST.sha256"}
        self.assertEqual(set(listed), actual)
        for rel, digest in listed.items():
            self.assertEqual(hashlib.sha256((payload / rel).read_bytes()).hexdigest(), digest)
        self.assertNotIn("MANIFEST.sha256", listed)


if __name__ == "__main__":
    unittest.main(verbosity=2)
