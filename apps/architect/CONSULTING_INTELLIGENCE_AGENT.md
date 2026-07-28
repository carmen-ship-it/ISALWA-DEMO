# Consulting Intelligence Agent

**Mission G.** A permanent background consultant that improves Digital Twin
quality whenever new evidence arrives.

## What this is not

It is **not** a chatbot, a support desk, or an assistant. It has no
conversational surface, no prompt, no user-facing message and no LLM call. It
never talks to anyone. Nobody "asks it" anything.

It is a **loop**: evidence lands → re-read what the engines already say →
write down what changed in a private notebook → decide whether another
question is even warranted.

## What it does not own

The agent contains **no intelligence of its own**. Every judgement it records
was produced by an engine that existed before it. It does not score, rank,
weight or infer. It reads, copies, and tags each note with the engine that
produced it — so any note can be traced back to its source.

This is the constraint that stops it becoming a second brain competing with
the first one. If a number appears in the notebook, some other engine already
published that exact number somewhere else in the product.

## The core loop

`runConsultingIntelligenceCycle(workspace, evidenceEvent)` —
`lib/consulting-intelligence/cycle.ts`.

| # | Step | Delegates to |
|---|------|--------------|
| 1 | Did understanding change? | `computeDiscoveryScore` via the evidence snapshot |
| 2 | Update the Company Model | `deriveCompanyModel` |
| 3 | Update the Knowledge Graph | `lib/intake` / `lib/knowledge` — **observed, not re-run** |
| 4 | Recalculate capability confidence | `deriveCapabilityIntelligence` (Mission A twin) |
| 5 | Detect contradictions | `evaluateContradictions` + knowledge vault + readiness conflicts |
| 6 | Detect missing evidence | Missing Information Engine |
| 7 | Retrieve related evidence | the evidence snapshot boundary |
| 8 | Single highest-value unknown | Missing Information Engine's own #1 ranking |
| 9 | Decide if another question is required | Readiness advice, vetoed by the self-check |

**Step 3 is deliberately a read.** The intake and knowledge pipelines already
merged the graph before the agent was called. Re-running them would be a
parallel implementation of the thing that just ran.

**Step 2 only fires when stale.** `deriveCompanyModel` mints fresh entity ids
on every call, so the cycle re-derives only when the model is missing or points
at an older blueprint. The practical effect: a processed *document* now
refreshes the Company Model, which the intake path never did before — it used
to stop at the vault.

Steps 1, 5, 6 and 7 all read the same evidence boundary, so the cycle computes
the snapshot **once** and shares it. The same evidence is never scored twice.

The cycle is synchronous and pure apart from the timestamp. It takes a
workspace and returns a new one; it never writes to a store, so both call sites
keep owning persistence exactly as they did before.

## Where it is wired

Into the two hooks that **already** update the workspace. No new pipeline, no
new store, no new route.

| Hook | File | Event kind |
|------|------|-----------|
| Interview / answer save | `lib/memory/apply-interview.ts` | `interview_answer` |
| Document pipeline completion | `lib/intake/pipeline.ts` (`ingestSource`) | `document` |

In `apply-interview` the cycle runs **last**, on the already-final workspace, so
it reads the same derived models every screen does and only ever *adds* its
notebook. In `ingestSource` it runs immediately **before** the single existing
save — one write, not two.

`EvidenceEvent` also accepts `meeting`, `note` and `workflow`, so a future
source plugs in without touching the cycle.

## Internal working memory

Persisted at `workspace.consultingIntelligence`
(`ConsultingWorkingMemory`). Optional on the type, so workspaces saved before
the agent existed stay valid — a missing notebook just means no cycle has run.

| Field | Source engine |
|-------|---------------|
| `hypotheses` | conversation memory · active hypotheses |
| `assumptions` | conversation memory · assumptions + the risk if false |
| `confidenceNotes` | Explainable Confidence · category `why` sentences |
| `contradictions` | interview claim-pair detector · knowledge vault · readiness conflicts |
| `missingEvidence` | Missing Information Engine · ranked |
| `automations` | Business Process Engine · automation candidates |
| `implementationRisks` | consulting intelligence · risks |
| `followUpAreas` | Readiness Engine · still-learning items |
| `relatedEvidence` | evidence snapshot · strongest signals |
| `capabilities` | Mission A twin + remaining time + complete flag |
| `understanding` | discovery score, compared against the previous cycle |
| `selfCheck` / `questionDecision` | this agent |
| `enginesRun` | audit trail of what actually re-ran |

Engine confidences arrive on two scales (0–1 from interview reasoning, 0–100
from scores). They are normalized to 0–100; a missing figure stays `null`
rather than becoming a fabricated zero.

### NEVER exposed to Client Mode

The notebook is how the platform thinks in private. A client (Álvaro) must
never see it. "Hipótesis" and "contradicción" about their own company reads as
the platform second-guessing them, and it leaks the uncertainty the Readiness
Engine exists to absorb.

So there is exactly **one** way to read it, and it takes a role
(`lib/consulting-intelligence/visibility.ts`):

```ts
consultingWorkingMemoryFor(workspace, role)   // client → always null
withoutConsultingWorkingMemory(workspace)     // strip at a serialization boundary
workspaceForRole(workspace, role)             // whole workspace, role-safe
```

`client` gets `null` — not a filtered subset, not an empty shell. The default
is the safe one: any role that is not explicitly `consultant` gets nothing.

Two further tripwires:

- `internal: true` is stamped on the object. Any client-facing serializer
  carrying an object with that flag has a bug.
- **Rendering rule:** if you did not get the object from
  `consultingWorkingMemoryFor`, do not render it.

Carmen-only visibility in the UI is possible later; for now the agent persists
and reasons, and renders nothing.

## Capability Intelligence state

`deriveCapabilityIntelligence` (`capability-state.ts`) reads the Mission A
Capability Digital Twin **verbatim** — every `confidence`, `known`, `unknown`,
risk and recommendation is Mission A's, unchanged — and adds only the two
things it does not carry:

- **Estimated remaining discovery time** = open gaps ×
  `MINUTES_PER_CLARIFICATION`, the same coarse estimate the client already sees.
- **Discovery complete** = `confidence >= READY_CONFIDENCE` (70, the Readiness
  Engine's existing bar) **and** zero open gaps.

Both conditions are required, so a capability can never auto-stop while a known
question is still outstanding. Verified: a capability at 68% with one gap left
stays open.

Capabilities no engine measures yet (Legal, Cumplimiento) report zero open gaps
simply because nothing tracks them. They are **never** marked complete —
promoting ignorance to knowledge is the one thing this must not do.

### Auto-stop

Once a capability is complete, discovery stops requesting evidence for it:

```ts
shouldAskAboutCapability(states, "sales")   // false once sales is complete
```

`questionDecision.autoStoppedCapabilities` lists them per cycle.

## The self-check

Before a senior consultant asks anything, they run a silent check. The agent
writes it down (`self-check.ts`) — it is the guard against Principle 4, *never
ask unnecessary questions*: the agent must justify a question to itself before
discovery is allowed to ask it.

| Field | Question |
|-------|----------|
| `believe` | What do we believe? (reuses the interview's own belief line) |
| `why` | Why — which evidence, counted |
| `evidence` | What we actually hold |
| `contradicts` | What contradicts it |
| `whatIncreasesConfidence` | What would raise confidence most |
| `questionNecessary` | Is another question necessary at all |
| `reason` | Plain-language verdict |

A question is necessary only when readiness still says "ask", **and** not every
measurable capability is complete, **and** something concrete is actually open
(a ranked gap or an unresolved contradiction).

The agent never overrides readiness toward *more* questions — only ever toward
fewer.

## Client-visible side effects

Spanish, and routed through the engines that already own client wording
(`lib/readiness`, Missing Information, the Mission A twin). The agent adds no
new client-facing string of its own, and no AI vocabulary, confidence band or
internal note ever crosses the boundary.

## Verified behaviour

Exercised against the real engines on an empty workspace, a seeded workspace,
and a 15-answer discovery run:

- Capability confidence mirrors the discovery dimensions exactly
  (`sales:34` → Ventas 34%, `team:68` → RRHH 68%) — no re-scoring.
- Understanding delta tracked across cycles (0 → 19, `changed: true`);
  cycle counter increments.
- Contradiction detected from a real claim pair, confidence normalized
  0.7 → 70, tagged with its source detector.
- Auto-stop fires for a complete capability; an unmeasured capability
  (Legal) still returns "ask".
- Company Model correctly **not** re-derived when already fresh — no id churn.
- Client boundary: serialized client view contains no `internal: true`,
  no `selfCheck`, no `questionDecision`, no internal vocabulary.

## Files

```
lib/consulting-intelligence/
  cycle.ts             runConsultingIntelligenceCycle — the nine-step loop
  capability-state.ts  Mission A twin + remaining time + discovery complete
  working-memory.ts    private notes, each traced to the engine that made it
  self-check.ts        believe / why / evidence / contradicts / is this needed
  visibility.ts        the Client Mode gate
  types.ts             contracts
  index.ts             public surface
```

Related: `CAPABILITY_DIGITAL_TWIN.md` (Mission A),
`CONSULTANT_READINESS_ENGINE.md`, `MISSING_INFORMATION_ENGINE.md`,
`EXPLAINABLE_CONFIDENCE.md`, `PRODUCT_PRINCIPLES.md`.
