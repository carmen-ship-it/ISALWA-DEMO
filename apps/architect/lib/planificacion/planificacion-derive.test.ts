import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyWorkspace } from "@/lib/workspace/seed";
import {
  buildPlanificacionViewModel,
  deriveProposedCapabilities,
  mergeDerivedWithPersisted,
  migratePlanificacionToV2,
  PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
  createEmptyPlanificacionStateV2,
} from "@/lib/planificacion";
import type {
  BusinessBlueprint,
  CompanyWorkspace,
  IsalwaPlanificacionStateV2,
  PlanificacionPlanItem,
  SolutionArchitecture,
} from "@/types";
import { nowIso } from "@/lib/utils";

function emptyArchitectureState() {
  return {
    horizon: "current" as const,
    summary: "",
    systems: [],
    capabilities: [],
    notes: [],
  };
}

function fixtureBlueprint(workspace: CompanyWorkspace): BusinessBlueprint {
  return {
    id: "bp_fixture",
    workspaceId: workspace.id,
    version: 1,
    generatedAt: workspace.createdAt,
    title: "Fixture blueprint",
    summary: "Fixture company operates with documented sales workflows.",
    currentState: "Sales coordination relies on interviews and documents.",
    futureState: "Integrated operating model with traceable approvals.",
    capabilities: [
      {
        id: "cap_quote",
        name: "Quoting",
        purpose: "Prepare and track customer quotes.",
        owner: "Sales",
        department: "Sales",
        inputs: ["Customer request"],
        outputs: ["Quote"],
        dependencies: [],
        painPoints: [],
        futureOpportunities: [],
        evidence: [
          { source: "knowledge", id: "kf1", label: "Interview transcript excerpt" },
        ],
      },
    ],
    departments: [],
    roles: ["Sales manager"],
    systems: [],
    workflows: [],
    entities: [],
    operatingRules: [],
    painPoints: [],
    recommendations: ["Centralize quote tracking"],
    opportunities: [],
    modules: [],
    integrations: [],
    risks: [],
    assumptions: [],
    openQuestions: [],
    futureArchitecture: {
      current: emptyArchitectureState(),
      transition: emptyArchitectureState(),
      future: emptyArchitectureState(),
    },
    evidence: [
      { source: "knowledge", id: "kf1", label: "Interview transcript excerpt" },
    ],
    meetingId: null,
    interviewId: null,
    superseded: false,
  };
}

function fixtureSolution(workspace: CompanyWorkspace): SolutionArchitecture {
  return {
    id: "sol_fixture",
    workspaceId: workspace.id,
    blueprintId: "bp_fixture",
    blueprintVersion: 1,
    generatedAt: workspace.createdAt,
    summary: "Fixture solution for sales operations.",
    modules: [
      {
        id: "mod_sales",
        name: "Sales",
        purpose: "Manage quotes and customer engagement.",
        confidence: 72,
        evidence: [
          { source: "blueprint", id: "bp_fixture", label: "Blueprint v1" },
        ],
        dependencies: [],
        futureExpansion: [],
      },
    ],
    entities: [],
    relationships: [],
    roles: [],
    permissions: [],
    navigation: [],
    departments: [],
    businessRules: [],
    approvalRules: [],
    integrations: [],
    aiAgents: [],
    workflows: [],
    database: [],
    apis: [],
    roadmap: [
      {
        id: "phase_1",
        phase: 1,
        name: "Sales foundation",
        goals: ["Quotes in system"],
        modules: ["Sales"],
        dependencies: [],
        businessValue: "Establish sales data foundation",
        estimatedComplexity: "moderate",
        confidence: 0.7,
      },
    ],
    configuration: {},
    evidence: [
      { source: "blueprint", id: "bp_fixture", label: "Blueprint v1" },
    ],
    overallConfidence: 0.72,
  };
}

function workspaceWithDiscovery(): CompanyWorkspace {
  const workspace = createEmptyWorkspace("Fixture Co", "manufacturing", "ws_fixture");
  const blueprint = fixtureBlueprint(workspace);
  workspace.blueprints = [blueprint];
  workspace.currentBlueprintId = blueprint.id;
  workspace.solutionArchitecture = fixtureSolution(workspace);
  workspace.businessUnderstanding = 42;
  workspace.recommendations = [
    {
      id: "rec1",
      title: "Improve quote visibility",
      rationale: "Leadership lacks a single quote status view.",
      priority: "now",
      relatedPainPoints: ["Manual tracking"],
    },
  ];
  return workspace;
}

describe("planificacion derive-first", () => {
  it("empty workspace stays honest without fake commercial facts", () => {
    const workspace = createEmptyWorkspace("Empty Co");
    const vm = buildPlanificacionViewModel(workspace);

    assert.equal(vm.discoveryInProgress, true);
    assert.equal(vm.overallHeadline, PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE);

    const demoScreenCapability = vm.byKind.capability.find((i) =>
      /^(Pulso|Radar|Personas|Territorio|Señal|Cierre)$/i.test(i.title),
    );
    assert.equal(demoScreenCapability, undefined);

    const santaCruz = vm.items.find((i) => /santa cruz/i.test(i.body));
    assert.equal(santaCruz, undefined);

    assert.ok(
      vm.items.some((i) => i.title === PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE),
    );
  });

  it("derives understanding and capabilities from architect sources", () => {
    const workspace = workspaceWithDiscovery();
    const vm = buildPlanificacionViewModel(workspace);

    assert.equal(vm.discoveryInProgress, false);
    assert.ok(
      vm.byKind.understanding.some((i) => i.body.includes("documented sales")),
    );
    assert.ok(vm.byKind.recommendation.some((i) => i.title.includes("quote visibility")));
    assert.ok(vm.byKind.capability.some((i) => i.title === "Sales"));
    assert.ok(vm.phases.some((p) => p.name === "Sales foundation"));
    assert.ok(vm.items.every((i) => i.architectProposal.body.length > 0));
  });

  it("includes command center requirements without pulso as approved capability", () => {
    const workspace = workspaceWithDiscovery();
    const vm = buildPlanificacionViewModel(workspace);
    assert.ok(vm.items.some((i) => i.title.includes("Centro de comando")));
    const pulsoDemo = vm.items.find((i) => i.demoPrototypeRef === "pulso");
    assert.ok(pulsoDemo);
    assert.notEqual(pulsoDemo?.governanceStatus, "aprobado");
    assert.equal(vm.byKind.capability.some((c) => c.title === "Pulso"), false);
  });

  it("partial evidence yields confirmation rather than silent fact", () => {
    const workspace = createEmptyWorkspace("Thin Co");
    workspace.businessUnderstanding = 15;
    workspace.openQuestions = ["How are purchase approvals handled today?"];
    const vm = buildPlanificacionViewModel(workspace);

    const gap = vm.byKind.information_gap.find((i) =>
      i.body.includes("purchase approvals"),
    );
    assert.ok(gap);
    assert.equal(gap?.governanceStatus, "requiere_confirmacion");
  });

  it("does not treat commercial demo modules as derived capabilities", () => {
    const caps = deriveProposedCapabilities(workspaceWithDiscovery());
    const demoNames = ["Pulso", "Radar", "Personas", "Territorio", "Señal", "Cierre"];
    for (const name of demoNames) {
      assert.equal(caps.some((c) => c.title === name), false);
    }
  });

  it("preserves client responses and approvals across derivation", () => {
    const workspace = workspaceWithDiscovery();
    const persisted: IsalwaPlanificacionStateV2 = createEmptyPlanificacionStateV2();
    const stableKey = "capability:sales";
    const approvedItem: PlanificacionPlanItem = {
      id: "pitem_custom",
      stableKey,
      kind: "capability",
      title: "Sales (approved title)",
      body: "Approved behavior from client.",
      evidenceRefs: [],
      governanceStatus: "aprobado",
      sourceEngines: ["solution"],
      derivedAt: nowIso(),
      derivationVersion: 1,
      approval: {
        actor: "Álvaro",
        at: nowIso(),
        snapshotVersion: 1,
      },
    };
    persisted.items = [approvedItem];

    workspace.planificacion = persisted;
    const vm = buildPlanificacionViewModel(workspace);
    const merged = vm.items.find((i) => i.stableKey === stableKey);
    assert.ok(merged);
    assert.equal(merged?.governanceStatus, "aprobado");
    assert.equal(merged?.title, "Sales (approved title)");
    assert.equal(merged?.approval?.actor, "Álvaro");
  });

  it("mergeDerivedWithPersisted keeps correction without dropping proposal", () => {
    const persisted = createEmptyPlanificacionStateV2();
    const derivedAt = nowIso();
    const stableKey = "understanding:fixture-summary";
    persisted.items = [
      {
        id: "pitem_corr",
        stableKey,
        kind: "understanding",
        title: "Original",
        body: "Original body",
        evidenceRefs: [],
        governanceStatus: "en_revision",
        sourceEngines: ["blueprint"],
        derivedAt,
        derivationVersion: 1,
        clientResponse: {
          action: "corregir",
          text: "Corrected understanding from ISALWA.",
          actor: "Isa",
          at: derivedAt,
        },
      },
    ];

    const derived: PlanificacionPlanItem[] = [
      {
        id: "pitem_derived",
        stableKey,
        kind: "understanding",
        title: "Derived title",
        body: "Derived body should not overwrite correction silently.",
        evidenceRefs: [],
        governanceStatus: "propuesta",
        sourceEngines: ["blueprint"],
        derivedAt,
        derivationVersion: 1,
      },
    ];

    const merged = mergeDerivedWithPersisted(derived, [], persisted);
    const item = merged.items.find((i) => i.stableKey === stableKey);
    assert.ok(item);
    assert.equal(item?.governanceStatus, "en_revision");
    assert.equal(item?.body, "Corrected understanding from ISALWA.");
    assert.equal(item?.clientResponse?.action, "corregir");
  });

  it("increment 5: empty workspace has foundation architecture without fake finance KPIs", () => {
    const workspace = createEmptyWorkspace("Empty Co");
    const vm = buildPlanificacionViewModel(workspace);

    assert.ok(
      vm.byKind.technical_requirement.some((i) =>
        i.stableKey.includes("foundation-tenant-isolation"),
      ),
    );
    assert.ok(
      vm.byKind.technical_requirement.some((i) =>
        i.title.includes("Finanzas") && i.title.includes("LOCKED"),
      ),
    );

    const fakeAr = vm.items.find(
      (i) =>
        /\$\s*\d|AR\s*=|saldo\s*[:=]\s*\d|facturas\s*=\s*\d/i.test(i.body) ||
        /\$\s*\d|AR\s*=|saldo\s*[:=]\s*\d|facturas\s*=\s*\d/i.test(i.title),
    );
    assert.equal(fakeAr, undefined);

    for (const item of vm.items) {
      assert.notEqual(item.governanceStatus, "aprobado");
    }

    assert.ok(vm.questions.some((q) => q.stableKey.includes("finance-q-accounting-system")));
    assert.ok(vm.questions.some((q) => q.stableKey.includes("identity-q-customer-lists")));
  });

  it("increment 5: locked finance and warehouse show honest unverified cross-dept state", () => {
    const workspace = workspaceWithDiscovery();
    const vm = buildPlanificacionViewModel(workspace);

    const warehouseDep = vm.items.find((i) =>
      i.body.includes("promesa comercial no verificada"),
    );
    assert.ok(warehouseDep);
    assert.equal(warehouseDep?.governanceStatus, "propuesta");

    const financeLocked = vm.items.find((i) => i.osModuleHint === "CapabilityRegistry:Finance");
    assert.ok(financeLocked);
    assert.equal(financeLocked?.governanceStatus, "propuesta");
  });

  it("increment 5: finance items are not auto-approved from derivation alone", () => {
    const workspace = workspaceWithDiscovery();
    const vm = buildPlanificacionViewModel(workspace);
    const financeItems = vm.items.filter((i) => i.stableKey.includes("finance-"));
    assert.ok(financeItems.length > 0);
    for (const item of financeItems) {
      assert.notEqual(item.governanceStatus, "aprobado");
      assert.equal(item.approval, undefined);
    }
  });

  it("increment 5.1: workforce and party architecture without fake counts", () => {
    const workspace = createEmptyWorkspace("Empty Co");
    const vm = buildPlanificacionViewModel(workspace);

    assert.ok(
      vm.byKind.technical_requirement.some((i) =>
        i.stableKey.includes("workforce-person-member-auth"),
      ),
    );
    assert.ok(
      vm.byKind.technical_requirement.some((i) =>
        i.stableKey.includes("party-unified-party-not-silos"),
      ),
    );
    assert.ok(
      vm.byKind.technical_requirement.some((i) =>
        i.title.includes("Handoff") || i.stableKey.includes("admin-handoff"),
      ),
    );

    const fakeCounts = vm.items.find((i) =>
      /\d+\s*(empleados|clientes|proveedores|employees|customers|suppliers)/i.test(
        `${i.title} ${i.body}`,
      ),
    );
    assert.equal(fakeCounts, undefined);

    assert.ok(vm.questions.some((q) => q.stableKey.includes("workforce-q-")));
    assert.ok(vm.questions.some((q) => q.stableKey.includes("party-q-")));
    assert.ok(vm.questions.some((q) => q.stableKey.includes("admin-q-")));
  });

  it("increment 5.1: historical attribution and delegation requirements are proposed", () => {
    const vm = buildPlanificacionViewModel(createEmptyWorkspace("Empty Co"));
    const hist = vm.items.find((i) => i.stableKey.includes("workforce-effective-dated-org"));
    assert.ok(hist);
    assert.equal(hist?.governanceStatus, "propuesta");
    assert.match(hist?.body ?? "", /occurredAt|histórica|historial/i);

    const delegation = vm.items.find((i) => i.stableKey.includes("workforce-delegation-expiry"));
    assert.ok(delegation);
    assert.match(delegation?.body ?? "", /expir|expiresAt/i);

    const termination = vm.items.find((i) => i.stableKey.includes("workforce-termination-retain-person"));
    assert.ok(termination);
    assert.match(termination?.body ?? "", /Person|borrar|historial/i);
  });

  it("increment 5.1: party roles are not independent identity silos", () => {
    const vm = buildPlanificacionViewModel(createEmptyWorkspace("Empty Co"));
    const unified = vm.items.find((i) => i.stableKey.includes("party-unified-party-not-silos"));
    assert.ok(unified);
    assert.match(unified?.body ?? "", /PartyRoleAssignment|Party canónico/i);
    assert.match(unified?.body ?? "", /no bases maestras independientes/i);
  });

  it("increment 5.1: finance remains locked on empty workspace", () => {
    const vm = buildPlanificacionViewModel(createEmptyWorkspace("Empty Co"));
    const financeLocked = vm.items.find(
      (i) => i.title.includes("Finanzas") && i.title.includes("LOCKED"),
    );
    assert.ok(financeLocked);
    assert.notEqual(financeLocked?.governanceStatus, "aprobado");
  });

  it("migrates v1 persisted state without inventing facts", () => {
    const v1 = {
      version: 1 as const,
      initializedAt: nowIso(),
      lastUpdatedAt: nowIso(),
      dataRequirements: [
        {
          id: "pdata1",
          title: "Lista de clientes",
          description: "Export from legacy checklist.",
          status: "pendiente" as const,
        },
      ],
      decisions: [
        {
          id: "pdec1",
          question: "¿Quién aprueba excepciones de precio?",
          why: "Authority gap",
          options: ["Dirección", "Gerente comercial"],
          recommendation: "Dirección",
          response: null,
          status: "pendiente" as const,
          isDemo: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ],
      changeLog: [],
      preservedProcedures: [],
    };

    const v2 = migratePlanificacionToV2(v1);
    assert.equal(v2.version, 2);
    assert.equal(v2.items.length, 1);
    assert.equal(v2.items[0].kind, "information_gap");
    assert.equal(v2.questions.length, 1);
    assert.equal(v2.questions[0].question, "¿Quién aprueba excepciones de precio?");
  });
});
