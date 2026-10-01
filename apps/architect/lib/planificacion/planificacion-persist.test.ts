import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyPlanificacionStateV2 } from "@/lib/planificacion/migrate-v2";
import {
  applyPlanItemClientAction,
  approvePlanItem,
} from "@/lib/planificacion/persist-client";
import type { PlanificacionViewModelItem } from "@/types";
import { nowIso } from "@/lib/utils";

function viewItem(
  overrides: Partial<PlanificacionViewModelItem> = {},
): PlanificacionViewModelItem {
  const stamp = nowIso();
  return {
    id: "pitem_test",
    stableKey: "capability:test",
    kind: "capability",
    title: "Test capability",
    body: "Architect proposed body",
    evidenceRefs: [],
    governanceStatus: "requiere_confirmacion",
    sourceEngines: ["solution"],
    derivedAt: stamp,
    derivationVersion: 1,
    architectProposal: {
      title: "Test capability",
      body: "Architect proposed body",
      recommendation: "Do this",
    },
    ...overrides,
  };
}

describe("planificacion persist client", () => {
  it("persists correction without losing architect proposal in view model layer", () => {
    const state = createEmptyPlanificacionStateV2();
    const item = viewItem();
    const next = applyPlanItemClientAction(
      state,
      item,
      "corregir",
      "ISALWA corrected understanding.",
      "Álvaro",
    );
    const persisted = next.items.find((i) => i.stableKey === item.stableKey);
    assert.ok(persisted);
    assert.equal(persisted?.body, "ISALWA corrected understanding.");
    assert.equal(persisted?.clientResponse?.action, "corregir");
    assert.equal(persisted?.governanceStatus, "en_revision");
    assert.equal(next.changeLog.length, 1);
  });

  it("approval persists snapshot and survives reload shape", () => {
    const state = createEmptyPlanificacionStateV2();
    const item = viewItem({
      clientResponse: {
        action: "confirmar",
        text: "Architect proposed body",
        actor: "Isa",
        at: nowIso(),
      },
    });
    const next = approvePlanItem(state, item, "Álvaro");
    const persisted = next.items.find((i) => i.stableKey === item.stableKey);
    assert.ok(persisted?.approval);
    assert.equal(persisted?.governanceStatus, "aprobado");
    assert.equal(persisted?.approval?.actor, "Álvaro");
  });
});
