import { createId } from "@/lib/utils";
import type {
  ImplementationPhase,
  SolutionModule,
  SolutionModuleName,
} from "@/types";

/**
 * Implementation roadmap phases — deterministic.
 */
export function detectRoadmap(modules: SolutionModule[]): ImplementationPhase[] {
  const names = new Set(modules.map((m) => m.name));
  const pick = (...candidates: SolutionModuleName[]) =>
    candidates.filter((c) => names.has(c));

  const phases: ImplementationPhase[] = [
    {
      id: createId("sphase"),
      phase: 1,
      name: "Foundation",
      goals: [
        "Establish identity, roles, and system of record principles",
        "Stand up core customer/entity foundations",
      ],
      modules: pick("CRM", "Documents", "Approvals", "Notifications", "Knowledge"),
      dependencies: ["Blueprint agreement", "Owner sponsorship"],
      businessValue: "Creates durable truth and access control before process automation.",
      estimatedComplexity: "moderate",
      confidence: 0.85,
    },
    {
      id: createId("sphase"),
      phase: 2,
      name: "Core Sales",
      goals: [
        "Digitize commercial motion from inquiry to order",
        "Replace chat-as-CRM patterns",
      ],
      modules: pick("Sales", "CRM", "Analytics"),
      dependencies: ["Phase 1 foundation"],
      businessValue: "Protects customer history and accelerates quote-to-order.",
      estimatedComplexity: "high",
      confidence: 0.84,
    },
    {
      id: createId("sphase"),
      phase: 3,
      name: "Operations",
      goals: [
        "Digitize purchasing, inventory, and production handoffs",
        "Introduce approval trails for material spend",
      ],
      modules: pick(
        "Purchasing",
        "Inventory",
        "Production",
        "Maintenance",
        "Scheduling",
        "Field Service",
        "Assets",
      ),
      dependencies: ["Phase 2 commercial truth"],
      businessValue: "Removes spreadsheet and verbal coordination from core ops.",
      estimatedComplexity: "very_high",
      confidence: 0.8,
    },
    {
      id: createId("sphase"),
      phase: 4,
      name: "Automation",
      goals: [
        "Automate exception detection and reporting",
        "Reduce manual duplicate entry",
      ],
      modules: pick("Analytics", "Notifications", "Finance", "Collections"),
      dependencies: ["Phase 3 operational data quality"],
      businessValue: "Managers intervene early; finance sees current truth.",
      estimatedComplexity: "high",
      confidence: 0.75,
    },
    {
      id: createId("sphase"),
      phase: 5,
      name: "AI",
      goals: [
        "Assist on durable data only",
        "Summarize exceptions and draft follow-ups",
      ],
      modules: pick("AI Assistant", "Knowledge"),
      dependencies: ["Clean data", "Clear ownership", "Phases 1–4"],
      businessValue: "Leverage AI without making it the source of truth.",
      estimatedComplexity: "moderate",
      confidence: 0.6,
    },
  ];

  return phases.filter((p) => p.modules.length > 0);
}
