"use client";

/**
 * Executive Simulator — thin presentation layer over Mission 17's
 * `lib/simulation/` rules engine. Read-only "¿Qué pasa si…?" scenarios.
 *
 * Hard rules for this file:
 * - Never computes impact itself — only calls `listScenarios` / `simulate`
 *   / `extractSimulationSignals` from `@/lib/simulation`.
 * - Never writes to the workspace — purely derived, in-memory view state
 *   (`selectedScenarioId`, `domainFilter`).
 * - Never invents numbers or reasons — every line shown comes from a
 *   `SimulationResult` / `SimulationSignals` field, or is an honest
 *   "not available yet" message.
 */

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Boxes,
  Factory,
  Globe2,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserPlus,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  extractSimulationSignals,
  listScenarios,
  simulate,
  type ConfidenceBand,
  type InvestmentBand,
  type Scenario,
  type ScenarioId,
  type SimulationDomain,
  type SimulationResult,
  type SimulationSignals,
  type TimelineBand,
} from "@/lib/simulation";
import type { CompanyWorkspace } from "@/types";
import { cn } from "@/lib/utils";

const SCENARIO_ICONS: Record<ScenarioId, LucideIcon> = {
  hire_salespeople: UserPlus,
  automate_approvals: ShieldCheck,
  open_warehouse: Boxes,
  add_crm: Workflow,
  increase_production: Factory,
  reduce_staff: UserMinus,
  new_region: Globe2,
};

/** Executive-friendly Spanish labels for the engine's own domain taxonomy. */
const DOMAIN_LABELS: Record<SimulationDomain, string> = {
  capacity: "Capacidad y sitios",
  staffing: "Contratación y equipo",
  sales: "Ventas e ingresos",
  operations: "Procesos y aprobaciones",
  inventory: "Inventario",
  automation: "Automatización",
  financial: "Inversión",
};

const INVESTMENT_LABELS: Record<InvestmentBand, string> = {
  low: "Baja",
  moderate: "Moderada",
  high: "Alta",
  very_high: "Muy alta",
};

const TIMELINE_LABELS: Record<TimelineBand, string> = {
  "2_weeks": "Aprox. 2 semanas",
  "30_days": "Aprox. 30 días",
  "90_days": "Aprox. 90 días",
  "6_months": "Aprox. 6 meses",
  "12_months": "Aprox. 12 meses",
};

const CONFIDENCE_LABELS: Record<ConfidenceBand, string> = {
  low: "Baja",
  moderate: "Media",
  high: "Alta",
};

const CONFIDENCE_TONE: Record<ConfidenceBand, string> = {
  low: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  moderate: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80",
  high: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
};

/**
 * Human-readable translation of every `signalsUsed` key the engine can
 * emit (enumerated from `lib/simulation/*.ts`). Presentation only — does
 * not alter what the engine decided to use, only how it reads.
 */
const SIGNAL_DESCRIPTIONS: Record<
  string,
  (signals: SimulationSignals) => string
> = {
  operationsMaturity: (s) =>
    `Madurez operativa observada en el diagnóstico: ${formatMaturity(s.operationsMaturity)}.`,
  salesMaturity: (s) =>
    `Madurez comercial observada en el diagnóstico: ${formatMaturity(s.salesMaturity)}.`,
  peopleMaturity: (s) =>
    `Madurez de personas observada en el diagnóstico: ${formatMaturity(s.peopleMaturity)}.`,
  automationScore: (s) =>
    `Nivel de automatización actual de los procesos: ${formatMaturity(s.automationScore)}.`,
  hasCrm: () => "Ya hay señal de un CRM en el software actual.",
  hasErp: () => "Ya hay señal de un ERP en el software actual.",
  hasManualApprovals: () =>
    "El diagnóstico muestra aprobaciones manuales hoy.",
  hasWhatsappDependency: () =>
    "Hay dependencia detectada de WhatsApp para procesos del negocio.",
  hasExcelDependency: () =>
    "Hay dependencia detectada de Excel u hojas de cálculo.",
  companySizeBand: (s) =>
    `Tamaño de empresa estimado: ${sizeBandLabel(s.companySizeBand)}.`,
  teamHint: (s) => `Referencia de equipo registrada: "${s.teamHint}".`,
  geographyHint: (s) =>
    `Referencia geográfica registrada: "${s.geographyHint}".`,
  single_employee_owns_everything: () =>
    "Riesgo detectado en consultoría: una sola persona concentra el conocimiento operativo.",
  tribal_knowledge: () =>
    "Riesgo detectado en consultoría: hay conocimiento clave sin documentar.",
  no_audit_trail: () =>
    "Riesgo detectado en consultoría: hoy no existe un rastro auditable.",
};

export function ExecutiveSimulatorPanel({
  workspace,
}: {
  workspace: CompanyWorkspace | null;
}) {
  const scenarios = useMemo(() => listScenarios(), []);
  const [selectedId, setSelectedId] = useState<ScenarioId | null>(null);
  const [domainFilter, setDomainFilter] = useState<SimulationDomain | null>(
    null,
  );

  const signals = useMemo(
    () => extractSimulationSignals(workspace ?? null),
    [workspace],
  );

  const result: SimulationResult | null = useMemo(() => {
    if (!selectedId) return null;
    return simulate(selectedId, workspace ?? undefined);
  }, [selectedId, workspace]);

  const domainsAvailable = useMemo(() => {
    const seen = new Set<SimulationDomain>();
    for (const scenario of scenarios) {
      for (const domain of scenario.domains) seen.add(domain);
    }
    return Array.from(seen);
  }, [scenarios]);

  const visibleScenarios = domainFilter
    ? scenarios.filter((scenario) => scenario.domains.includes(domainFilter))
    : scenarios;

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-neutral-600">
        Estas simulaciones no cambian la información real de su empresa. Son
        exploraciones de &ldquo;qué pasaría si&rdquo;, basadas en reglas — no
        son pronósticos ni promesas financieras.
      </p>

      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Elija qué área quiere explorar
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={domainFilter === null}
            onClick={() => setDomainFilter(null)}
          >
            Todos los escenarios
          </FilterChip>
          {domainsAvailable.map((domain) => (
            <FilterChip
              key={domain}
              active={domainFilter === domain}
              onClick={() =>
                setDomainFilter((current) =>
                  current === domain ? null : domain,
                )
              }
            >
              {DOMAIN_LABELS[domain]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleScenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            selected={scenario.id === selectedId}
            onSelect={() =>
              setSelectedId((current) =>
                current === scenario.id ? current : scenario.id,
              )
            }
          />
        ))}
      </div>

      {visibleScenarios.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No hay escenarios disponibles para esta área todavía.
        </p>
      ) : null}

      {selectedId && result ? (
        <SimulationResultView signals={signals} result={result} />
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-5 py-6">
          <p className="text-sm leading-relaxed text-neutral-700">
            Elija un escenario arriba para ver el punto de partida, el
            cambio propuesto y el impacto esperado — con la razón detrás de
            cada resultado.
          </p>
        </div>
      )}
    </div>
  );
}

function ScenarioCard({
  scenario,
  selected,
  onSelect,
}: {
  scenario: Scenario;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = SCENARIO_ICONS[scenario.id] ?? Sparkles;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-3xl border px-5 py-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        selected
          ? "border-neutral-950 bg-neutral-950 text-white shadow-lg"
          : "border-neutral-200/80 bg-white hover:border-neutral-300 hover:shadow-sm",
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-2xl",
          selected ? "bg-white/15" : "bg-neutral-100",
        )}
      >
        <Icon
          className={cn("h-4 w-4", selected ? "text-white" : "text-neutral-700")}
          aria-hidden
        />
      </span>
      <p
        className={cn(
          "mt-3 text-base font-medium",
          selected ? "text-white" : "text-neutral-950",
        )}
      >
        {scenario.name}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm leading-relaxed",
          selected ? "text-white/75" : "text-neutral-600",
        )}
      >
        {scenario.description}
      </p>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}

function SimulationResultView({
  signals,
  result,
}: {
  signals: SimulationSignals;
  result: SimulationResult;
}) {
  const baseline = describeBaseline(signals, result.signalsUsed);
  const rationale = humanizeRationale(result);

  return (
    <motion.div
      key={result.scenarioId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Punto de partida
          </p>
          <p className="mt-1 text-lg text-neutral-950">
            Lo que ya sabemos hoy
          </p>
          {baseline.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              Aún no hay suficiente información del diagnóstico para
              describir el punto de partida en esta área. El escenario se
              calcula igual, pero con confianza acotada.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {baseline.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-neutral-700">
                  • {line}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Escenario · &ldquo;{result.scenarioName}&rdquo;
          </p>
          <p className="mt-1 text-lg text-neutral-950">
            {result.description}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Esta es la pregunta que se está simulando — no un cambio ya
            decidido.
          </p>
        </Card>
      </div>

      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          Impacto esperado para el negocio
        </p>
        {result.likelyImpact.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            El motor no devolvió impacto esperado para este escenario con la
            información actual.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {result.likelyImpact.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-neutral-800">
                • {line}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              Inversión relativa
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-2 w-6 rounded-full",
                      n <= result.investment.scale
                        ? "bg-neutral-900"
                        : "bg-neutral-200",
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-neutral-900">
                {INVESTMENT_LABELS[result.investment.band]}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              {result.investment.summary}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              Horizonte de tiempo
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-900">
              {TIMELINE_LABELS[result.timeline.band]}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              {result.timeline.summary}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            Riesgos a vigilar
          </p>
          {result.risks.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              El motor no identificó riesgos adicionales para este escenario
              con la información actual.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {result.risks.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-neutral-700">
                  • {line}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            De qué depende
          </p>
          {result.dependencies.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              El motor no identificó dependencias adicionales para este
              escenario con la información actual.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {result.dependencies.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-neutral-700">
                  • {line}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          Por qué el simulador llega a este resultado
        </p>
        <div className="mt-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
              CONFIDENCE_TONE[result.confidence.band],
            )}
          >
            Confianza {CONFIDENCE_LABELS[result.confidence.band]} ·{" "}
            {Math.round(result.confidence.score * 100)}%
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          {rationale}
        </p>

        {result.domainsApplied.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              Áreas del negocio consideradas
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.domainsApplied.map((domain) => (
                <span
                  key={domain}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700"
                >
                  {DOMAIN_LABELS[domain]}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {result.signalsUsed.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              Evidencia del diagnóstico usada para ajustar este resultado
            </p>
            <ul className="mt-2 space-y-1.5">
              {result.signalsUsed.map((key) => (
                <li key={key} className="text-sm text-neutral-700">
                  • {SIGNAL_DESCRIPTIONS[key]?.(signals) ?? key}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            Este resultado usa solo las reglas del escenario — todavía no
            hay evidencia del diagnóstico que lo ajuste. A medida que el
            diagnóstico avance, el simulador podrá afinar este resultado.
          </p>
        )}
      </Card>
    </motion.div>
  );
}

function describeBaseline(
  signals: SimulationSignals,
  signalsUsed: string[],
): string[] {
  const lines: string[] = [];

  if (signals.companyName) {
    lines.push(
      `Empresa: ${signals.companyName}${signals.industry ? ` · ${signals.industry}` : ""}.`,
    );
  }
  if (signals.understanding > 0) {
    lines.push(
      `Nivel de comprensión del negocio en el diagnóstico: ${Math.round(signals.understanding * 100)}%.`,
    );
  }
  if (signals.companySizeBand !== "unknown") {
    lines.push(`Tamaño de empresa estimado: ${sizeBandLabel(signals.companySizeBand)}.`);
  }
  if (signals.departments.length > 0) {
    lines.push(`Departamentos identificados: ${signals.departments.join(", ")}.`);
  }
  if (signals.currentSoftware.length > 0) {
    lines.push(`Software actual conocido: ${signals.currentSoftware.join(", ")}.`);
  }

  for (const key of signalsUsed) {
    const describe = SIGNAL_DESCRIPTIONS[key];
    if (!describe) continue;
    const line = describe(signals);
    if (!lines.includes(line)) lines.push(line);
  }

  return lines;
}

/**
 * The engine's own rationale text sometimes quotes the raw `scenarioId`
 * (e.g. «hire_salespeople») — fine for logs, not for an executive-facing
 * screen (Álvaro included). Swap it for the scenario's own Spanish `name`,
 * already present on the same result — a display fix only, no new wording
 * or logic invented.
 */
function humanizeRationale(result: SimulationResult): string {
  return result.confidence.rationale.replace(
    `«${result.scenarioId}»`,
    `«${result.scenarioName}»`,
  );
}

function formatMaturity(score: number | null): string {
  if (score == null) return "sin dato todavía";
  return `${Math.round(score * 100)}%`;
}

function sizeBandLabel(band: SimulationSignals["companySizeBand"]): string {
  switch (band) {
    case "small":
      return "pequeña";
    case "medium":
      return "mediana";
    case "large":
      return "grande";
    default:
      return "sin determinar";
  }
}
