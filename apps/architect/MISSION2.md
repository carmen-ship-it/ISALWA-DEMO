# Mission 2 — Company Memory & Living Workspace

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 0 (foundation) + Mission 1 conversational depth already in tree

## Why Company Memory exists

ISALWA Architect must not feel like ChatGPT.

Every interview becomes a permanent project. The Architect remembers companies across weeks, months, and years. A future conversation continues naturally from the previous one — like a senior consultant who never starts over.

## What shipped

### Product surfaces

1. **Home / Companies** — “Your Companies” list (Acme, ISALWA, Viaggio, ABC Manufacturing) + New Company
2. **Workspace** — calm living company memory (not a SaaS dashboard)
3. **Interview** — existing guided adaptive experience, now attached to a workspace
4. **Living Report** — evolves across meetings

### Domain entities

Typed interfaces in `types/workspace.ts`:

- `CompanyWorkspace`
- `Meeting`
- `Person`
- `Document` (architecture only)
- `TimelineEvent`
- Repository contracts: Workspace / Meeting / Person / Document / Conversation

### Architecture folders

```text
lib/
  memory/        # apply completed interviews into durable memory
  workspace/     # seed companies, empty workspace factory
  repositories/  # mock + localStorage CompanyMemoryStore
  resume/        # Resume Engine — welcome-back briefings
  timeline/      # discovery → timeline events
  reports/       # living report merge
  documents/     # document center placeholders + future intake hooks
  search/        # lightweight local filter
```

`lib/reasoning/` was **not** moved or rewritten. Company Memory consumes Interview + ConversationMemory + DiscoveryReport outputs.

### Persistence

- Local `localStorage` via `LocalCompanyMemoryStore`
- Survives refresh
- Multi-company
- Supabase adapter is designed and throws — **not implemented**

### Resume behavior

When a workspace already has memory:

- Greeting remembers facts and open questions
- CTA becomes **Continue Discovery**
- Estimated remaining time shown
- Interview restores prior `ConversationMemory`
- Identity onboarding is skipped when participant + memory exist
- Completing an interview updates the workspace (meeting, people, timeline, living report, open questions)

### Explicitly not built

- Supabase wiring
- File uploads
- Voice
- Zoom / Teams imports
- PDF export

## How meetings evolve workspaces

On interview completion (`applyInterviewToWorkspace`):

1. Create or update `CompanyWorkspace`
2. Append `Meeting`
3. Upsert people mentioned
4. Append timeline events
5. Evolve living report
6. Preserve open questions + modules
7. Store `ConversationMemory` for resume

## How living reports evolve

`evolveLivingReport(prior, next)` merges evidence. It does **not** always regenerate from absolute zero. Latest interview updates summary, pains, recommendations, roadmap, risks, open questions, modules, AI opportunities, and confidence.

## Enables later missions

| Mission | Consumes |
| --- | --- |
| **Mission 3 — Process maps** | Workspace pain points, workflows, modules, timeline |
| **Mission 4 — Proposals** | Living report + recommendations + modules |
| **Mission 5 — Evidence intake** | Document kinds + future intake hooks already designed |

## Success criteria

The Architect no longer feels like isolated AI chats. It feels like a consulting firm that remembers every conversation, recommendation, decision, and piece of business knowledge.
