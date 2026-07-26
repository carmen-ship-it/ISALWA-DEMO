/**
 * Unified Business Knowledge Intake — normalizer.
 *
 * Cleans a single extractor's output before it is merged into workspace
 * state: trims whitespace, drops empty statements, and collapses exact
 * duplicates produced within the same batch (e.g. the same keyword matched
 * twice in one document). Cross-source deduplication happens later, in
 * `deduplication.ts`, against already-persisted state.
 */

import type { IntakeSlots } from "./contracts";

function normalizeStatement(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeByStatement<T extends { statement: string; evidenceIds: string[] }>(
  items: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const raw of items) {
    const statement = normalizeStatement(raw.statement);
    if (!statement) continue;
    const key = statement.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.evidenceIds = Array.from(
        new Set([...existing.evidenceIds, ...raw.evidenceIds]),
      );
      continue;
    }
    byKey.set(key, { ...raw, statement });
  }
  return Array.from(byKey.values());
}

function dedupeByLabel<T extends { label: string; evidenceIds: string[] }>(
  items: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const raw of items) {
    const label = normalizeStatement(raw.label);
    if (!label) continue;
    const key = label.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.evidenceIds = Array.from(
        new Set([...existing.evidenceIds, ...raw.evidenceIds]),
      );
      continue;
    }
    byKey.set(key, { ...raw, label });
  }
  return Array.from(byKey.values());
}

function dedupeByTitle<T extends { title: string; evidenceIds: string[] }>(
  items: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const raw of items) {
    const title = normalizeStatement(raw.title);
    if (!title) continue;
    const key = title.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.evidenceIds = Array.from(
        new Set([...existing.evidenceIds, ...raw.evidenceIds]),
      );
      continue;
    }
    byKey.set(key, { ...raw, title });
  }
  return Array.from(byKey.values());
}

export function normalizeSlots(slots: IntakeSlots): IntakeSlots {
  return {
    facts: dedupeByStatement(slots.facts.filter((f) => f.statement.trim())),
    entities: dedupeEntities(slots.entities),
    relationships: slots.relationships.filter(
      (r) => r.fromEntityName.trim() && r.toEntityName.trim(),
    ),
    unknowns: dedupeByLabel(slots.unknowns.filter((u) => u.label.trim())),
    contradictions: dedupeByStatement(
      slots.contradictions.filter((c) => c.statement.trim()),
    ),
    businessRules: dedupeByStatement(
      slots.businessRules.filter((r) => r.statement.trim()),
    ),
    painSignals: dedupeByTitle(slots.painSignals.filter((p) => p.title.trim())),
    opportunities: dedupeByTitle(
      slots.opportunities.filter((o) => o.title.trim()),
    ),
  };
}

function dedupeEntities(
  entities: IntakeSlots["entities"],
): IntakeSlots["entities"] {
  const byKey = new Map<string, IntakeSlots["entities"][number]>();
  for (const raw of entities) {
    const name = normalizeStatement(raw.name);
    if (!name) continue;
    const key = `${raw.kind}:${name.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.evidenceIds = Array.from(
        new Set([...existing.evidenceIds, ...raw.evidenceIds]),
      );
      existing.confidence = Math.max(existing.confidence, raw.confidence);
      continue;
    }
    byKey.set(key, { ...raw, name });
  }
  return Array.from(byKey.values());
}
