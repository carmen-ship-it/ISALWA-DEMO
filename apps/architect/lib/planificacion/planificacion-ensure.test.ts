import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyWorkspace } from "@/lib/workspace/seed";
import {
  ensurePlanificacion,
  emptyPlanificacionState,
  migratePlanificacionToV2,
  planificacionPersistShapeChanged,
} from "@/lib/planificacion";
import { createEmptyPlanificacionStateV1 } from "@/lib/planificacion/seed";
import { isPlanificacionStateV2 } from "@/types";
import { nowIso } from "@/lib/utils";

describe("planificacion ensure / migration healing", () => {
  it("creates empty v2 structure for new workspaces", () => {
    const workspace = createEmptyWorkspace("Empty Co");
    const healed = ensurePlanificacion(workspace);

    assert.ok(healed.planificacion);
    assert.equal(healed.planificacion?.version, 2);
    if (!isPlanificacionStateV2(healed.planificacion!)) {
      throw new Error("expected v2");
    }
    assert.equal(healed.planificacion.items.length, 0);
    assert.equal(healed.planificacion.questions.length, 0);
    assert.equal(healed.planificacion.changeLog.length, 0);

    const pulso = healed.planificacion.items.find((i) =>
      /pulso|santa cruz|sanitarios/i.test(`${i.title} ${i.body}`),
    );
    assert.equal(pulso, undefined);
  });

  it("emptyPlanificacionState is structure-only v2", () => {
    const state = emptyPlanificacionState();
    assert.equal(state.version, 2);
    assert.equal(state.items.length, 0);
    assert.equal(state.questions.length, 0);
    assert.equal(state.changeLog.length, 0);
  });

  it("migrates v1 checklist and preserves client checklist progress", () => {
    const stamp = nowIso();
    const v1 = createEmptyPlanificacionStateV1();
    v1.dataRequirements = [
      {
        id: "pdata1",
        title: "Lista de clientes",
        description: "Export recibida parcialmente.",
        status: "recibido",
        updatedAt: stamp,
        notes: "En revisión con dirección.",
      },
    ];
    v1.decisions = [
      {
        id: "pdec1",
        question: "¿Quién aprueba excepciones de precio?",
        why: "Autoridad comercial",
        options: ["Dirección"],
        recommendation: "Dirección",
        response: "Dirección",
        status: "aprobado",
        isDemo: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];
    v1.changeLog = [
      {
        id: "pch_real",
        at: stamp,
        change: "Cliente confirmó alcance piloto",
        reason: "Respuesta en planificación",
        approvedBy: "Álvaro",
        impact: "Alcance",
      },
      {
        id: "pch_fake",
        at: stamp,
        change: "Se inició la Planificación ISALWA",
        reason: "Ejemplo",
        approvedBy: "Sistema — ejemplo de planificación",
        impact: "Demo",
      },
    ];

    const workspace = createEmptyWorkspace("Migrate Co");
    workspace.planificacion = v1;
    const healed = ensurePlanificacion(workspace);
    const plan = healed.planificacion;

    assert.ok(plan && isPlanificacionStateV2(plan));
    assert.equal(plan.items.length, 1);
    assert.equal(plan.items[0].title, "Lista de clientes");
    assert.equal(plan.items[0].governanceStatus, "en_revision");
    assert.equal(plan.items[0].clientResponse?.text, "En revisión con dirección.");

    assert.equal(plan.questions.length, 1);
    assert.equal(plan.questions[0].response, "Dirección");
    assert.equal(plan.questions[0].status, "aprobado");

    assert.equal(plan.changeLog.length, 1);
    assert.equal(plan.changeLog[0].approvedBy, "Álvaro");
  });

  it("drops unresponded demo seed decisions during migration", () => {
    const stamp = nowIso();
    const v1 = createEmptyPlanificacionStateV1();
    v1.decisions = [
      {
        id: "demo1",
        question: "¿Cuál debe ser la primera pantalla?",
        why: "Demo",
        options: ["Pulso"],
        recommendation: "Pulso",
        response: null,
        status: "pendiente",
        isDemo: true,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "real1",
        question: "¿Quién firma contratos?",
        why: "Autoridad",
        options: ["Dirección"],
        recommendation: "Dirección",
        response: "Isa",
        status: "respondido",
        isDemo: true,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];

    const v2 = migratePlanificacionToV2(v1);
    assert.equal(v2.questions.length, 1);
    assert.equal(v2.questions[0].response, "Isa");
  });

  it("planificacionPersistShapeChanged detects v1 upgrade", () => {
    const v1 = createEmptyPlanificacionStateV1();
    const v2 = migratePlanificacionToV2(v1);
    assert.equal(planificacionPersistShapeChanged(v1, v2), true);
    assert.equal(planificacionPersistShapeChanged(v2, v2), false);
  });
});
