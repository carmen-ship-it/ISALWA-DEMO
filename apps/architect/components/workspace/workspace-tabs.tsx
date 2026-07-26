"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceTabId =
  | "executive"
  | "assessment"
  | "blueprint"
  | "company"
  | "architecture"
  | "processes"
  | "recommendations"
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
  { id: "roadmap", label: "Plan de implementación" },
  { id: "deliverables", label: "Documentos" },
];

export function WorkspaceTabs({
  active,
  onChange,
  panels,
}: {
  active: WorkspaceTabId;
  onChange: (id: WorkspaceTabId) => void;
  panels: Record<WorkspaceTabId, ReactNode>;
}) {
  const listId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    WORKSPACE_TABS.findIndex((tab) => tab.id === active),
  );
  const progress = ((activeIndex + 1) / WORKSPACE_TABS.length) * 100;

  const focusTab = useCallback((index: number) => {
    tabRefs.current[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      const last = WORKSPACE_TABS.length - 1;
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
      onChange(WORKSPACE_TABS[nextIndex]!.id);
      focusTab(nextIndex);
    },
    [focusTab, onChange],
  );

  return (
    <div className="mt-8">
      <div className="sticky top-0 z-30 -mx-6 border-b border-neutral-200/80 bg-[#fafafa]/95 px-6 py-3 backdrop-blur-md sm:-mx-10 sm:px-10">
        <div
          role="tablist"
          aria-label="Secciones del espacio de trabajo"
          id={listId}
          className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {WORKSPACE_TABS.map((tab, index) => {
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
          Sección {activeIndex + 1} de {WORKSPACE_TABS.length}
        </p>
      </div>

      {WORKSPACE_TABS.map((tab) => {
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
