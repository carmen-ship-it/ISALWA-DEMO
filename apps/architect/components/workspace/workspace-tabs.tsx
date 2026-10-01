"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ArchitectRole } from "@/types/auth";

export type WorkspaceTabId =
  | "executive"
  | "assessment"
  | "blueprint"
  | "company"
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
  { id: "architecture", label: "Sistema recomendado" },
  { id: "processes", label: "Cómo opera" },
  { id: "recommendations", label: "Recomendaciones" },
  // Client-safe: read-only "what if" scenarios over lib/simulation. Never
  // hide this from Client Mode alongside internal diagnostics tabs.
  { id: "simulator", label: "¿Qué pasa si…?" },
  { id: "roadmap", label: "Plan de implementación" },
  { id: "deliverables", label: "Documentos" },
];

/**
 * Client Mode (Álvaro): only polished consulting outputs. Hidden — internal
 * diagnostics ("assessment"), the company knowledge-graph/digital-twin panel
 * ("company"), and the dense internal process studio ("processes"). These
 * stay fully available to consultants. Presentation-only filter — no data or
 * capability changes, reuses the existing role from lib/auth session.
 */
const CLIENT_HIDDEN_TABS: ReadonlySet<WorkspaceTabId> = new Set([
  "assessment",
  "company",
  "processes",
]);

export function workspaceTabsForRole(
  role: ArchitectRole | null | undefined,
): Array<{ id: WorkspaceTabId; label: string }> {
  if (role === "consultant") return WORKSPACE_TABS;
  return WORKSPACE_TABS.filter((tab) => !CLIENT_HIDDEN_TABS.has(tab.id));
}

export function WorkspaceTabs({
  active,
  onChange,
  panels,
  tabs = WORKSPACE_TABS,
}: {
  active: WorkspaceTabId;
  onChange: (id: WorkspaceTabId) => void;
  panels: Record<WorkspaceTabId, ReactNode>;
  /** Defaults to the full set — pass a role-filtered list for Client Mode. */
  tabs?: Array<{ id: WorkspaceTabId; label: string }>;
}) {
  const listId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  );
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
      <div className="sticky top-[44px] z-30 -mx-6 border-b border-neutral-200/80 bg-[#fafafa]/95 px-6 py-3 backdrop-blur-md sm:-mx-10 sm:px-10">
        <div
          role="tablist"
          aria-label="Secciones del espacio de trabajo"
          id={listId}
          className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, index) => {
            const selected = tab.id === active;
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
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
                  selected
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200/80">
          <div
            className="h-full rounded-full bg-neutral-900 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-2 text-[11px] text-neutral-400">
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
