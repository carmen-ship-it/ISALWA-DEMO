"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceTabId =
  | "executive"
  | "assessment"
  | "blueprint"
  | "company"
  | "knowledge"
  | "insights"
  | "architecture"
  | "processes"
  | "recommendations"
  | "simulator"
  | "roadmap"
  | "deliverables";

export const WORKSPACE_TABS: Array<{ id: WorkspaceTabId; label: string }> = [
  { id: "executive", label: "Resumen" },
  { id: "assessment", label: "Diagnóstico" },
  { id: "blueprint", label: "Plan de negocio" },
  { id: "company", label: "Su empresa" },
  { id: "knowledge", label: "Conocimiento del negocio" },
  { id: "insights", label: "Perspectivas ejecutivas" },
  { id: "architecture", label: "Sistema recomendado" },
  { id: "processes", label: "Cómo opera" },
  { id: "recommendations", label: "Recomendaciones" },
  // Client-safe: read-only "what if" scenarios over lib/simulation — no
  // company data is changed and no raw engine internals are shown.
  { id: "simulator", label: "¿Qué pasa si…?" },
  { id: "roadmap", label: "Plan de implementación" },
  { id: "deliverables", label: "Documentos" },
];

/**
 * Client Mode — the polished subset Álvaro sees. Diagnóstico, Sistema
 * recomendado and Cómo opera stay inside Consultant Mode: reasoning
 * internals, engineering detail, and future contracts, per the Executive
 * Client Experience mission scope. ¿Qué pasa si…? (Simulator) is
 * client-safe by construction (Executive Simulator mission) — read-only,
 * Spanish-only, no raw engine ids — so it is included here.
 */
export const CLIENT_VISIBLE_TAB_IDS: WorkspaceTabId[] = [
  "executive",
  "blueprint",
  "company",
  "knowledge",
  "insights",
  "recommendations",
  "simulator",
  "roadmap",
  "deliverables",
];

/** Human-language label overrides shown only in Client Mode. */
export const CLIENT_TAB_LABELS: Partial<Record<WorkspaceTabId, string>> = {
  blueprint: "Cómo funciona su empresa",
};

export function WorkspaceTabs({
  active,
  onChange,
  panels,
  visibleTabIds,
  labelOverrides,
}: {
  active: WorkspaceTabId;
  onChange: (id: WorkspaceTabId) => void;
  panels: Record<WorkspaceTabId, ReactNode>;
  /** Client Mode — restrict which tabs render. Omit to show all (Consultant Mode). */
  visibleTabIds?: WorkspaceTabId[];
  /** Client Mode — friendlier copy for a subset of tabs. */
  labelOverrides?: Partial<Record<WorkspaceTabId, string>>;
}) {
  const listId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = visibleTabIds
    ? WORKSPACE_TABS.filter((tab) => visibleTabIds.includes(tab.id))
    : WORKSPACE_TABS;
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === active));
  const progress = ((activeIndex + 1) / tabs.length) * 100;

  const focusTab = useCallback((index: number) => {
    tabRefs.current[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      const last = tabs.length - 1;
      let nextIndex: number | null = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = index === last ? 0 : index + 1;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = index === 0 ? last : index - 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = last;
      }
      if (nextIndex == null) return;
      event.preventDefault();
      onChange(tabs[nextIndex]!.id);
      focusTab(nextIndex);
    },
    [focusTab, onChange, tabs],
  );

  return (
    <div className="mt-8">
      <div className="sticky top-11 z-30 -mx-6 border-b border-[var(--isalwa-mist)]/80 bg-[var(--isalwa-porcelain)]/95 px-6 py-3 backdrop-blur-md sm:-mx-10 sm:px-10">
        <div
          role="tablist"
          aria-label="Secciones del espacio de trabajo"
          id={listId}
          className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, index) => {
            const selected = tab.id === active;
            const label = labelOverrides?.[tab.id] ?? tab.label;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`workspace-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`workspace-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(tab.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45 focus-visible:ring-offset-2",
                  selected
                    ? "bg-[var(--isalwa-kiln)] text-white"
                    : "text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-mist)] hover:text-[var(--isalwa-kiln)]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--isalwa-mist)]/80">
          <div
            className="h-full rounded-full bg-[var(--isalwa-kiln)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-2 text-[11px] text-[var(--isalwa-slate)]/60">
          Sección {activeIndex + 1} de {tabs.length}
        </p>
      </div>

      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`workspace-panel-${tab.id}`}
            aria-labelledby={`workspace-tab-${tab.id}`}
            hidden={!selected}
            className="mt-8 scroll-mt-28 outline-none"
            tabIndex={0}
          >
            {selected ? panels[tab.id] : null}
          </div>
        );
      })}
    </div>
  );
}
