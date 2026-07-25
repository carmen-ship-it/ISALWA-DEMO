"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { formatRelativeActivity } from "@/lib/workspace";
import {
  AUTOMATION_COLORS,
  OVERLAY_LABELS,
  PAIN_COLORS,
  VIEW_LABELS,
  deriveProcessVisualization,
  deriveStepDependencies,
  listDepartmentsForWorkflow,
  nodeSurfaceStyle,
  type ProcessOverlayKind,
  type ProcessViewKind,
  type ProcessVisualizationContext,
  type VizNode,
} from "@/lib/process-visualization";
import { healthLabel, coverageBand } from "@/lib/presentation";
import type { BusinessProcessModel } from "@/types";

const selectClassName =
  "w-full rounded-full border border-neutral-200/80 bg-white/90 px-3.5 py-1.5 text-[13px] text-neutral-900 outline-none focus:border-neutral-400";

export function BusinessProcessesPanel({
  context,
}: {
  context: ProcessVisualizationContext | null;
}) {
  if (!context?.processes) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-600">
          Process views appear once the business blueprint is in place. Diagrams
          reflect discovered workflows — read-only, never invented.
        </p>
      </Card>
    );
  }

  return <ProcessStudio context={context} processes={context.processes} />;
}

function ProcessStudio({
  context,
  processes,
}: {
  context: ProcessVisualizationContext;
  processes: BusinessProcessModel;
}) {
  const [workflowId, setWorkflowId] = useState(
    processes.workflows[0]?.id ?? "",
  );
  const [view, setView] = useState<ProcessViewKind>("executive");
  const [overlay, setOverlay] = useState<ProcessOverlayKind>("none");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<
    "none" | "actor" | "document" | "approval" | "bottleneck"
  >("none");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

  const departments = useMemo(
    () => listDepartmentsForWorkflow(processes, workflowId),
    [processes, workflowId],
  );

  const viz = useMemo(
    () =>
      deriveProcessVisualization({
        context,
        workflowId,
        view,
        overlay,
        departmentFilter: view === "department" ? departmentFilter : null,
        collapsedGroups: collapsed,
      }),
    [context, workflowId, view, overlay, departmentFilter, collapsed],
  );

  const deps = useMemo(() => {
    if (!selectedStepId || overlay !== "dependency") return null;
    return deriveStepDependencies({
      context,
      workflowId,
      stepId: selectedStepId,
    });
  }, [context, workflowId, selectedStepId, overlay]);

  const workflow = processes.workflows.find((w) => w.id === workflowId);
  const selectedStep = workflow?.steps.find((s) => s.id === selectedStepId);

  const toggleCollapse = (dept: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-viz-node]")) return;
      dragging.current = {
        x: e.clientX,
        y: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.x;
    const dy = e.clientY - dragging.current.y;
    setPan({
      x: dragging.current.px + dx,
      y: dragging.current.py + dy,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const isHighlighted = (node: VizNode): boolean => {
    if (highlight === "none") return true;
    if (highlight === "approval") return node.isApproval;
    if (highlight === "bottleneck") {
      return viz?.bottleneckStepIds.includes(node.stepId) ?? false;
    }
    if (highlight === "actor" && selectedStep) {
      return node.actor === selectedStep.actor;
    }
    if (highlight === "document" && selectedStep) {
      const docs = new Set(selectedStep.documentsUsed.map((d) => d.toLowerCase()));
      const step = workflow?.steps.find((s) => s.id === node.stepId);
      return (
        step?.documentsUsed.some((d) => docs.has(d.toLowerCase())) ?? false
      );
    }
    return true;
  };

  if (!viz) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-600">
          No workflows available yet from discovery.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Process view
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          {viz.workflowName}
        </h3>
        <p className="mt-3 text-neutral-600">{processes.summary}</p>
        <p className="mt-4 text-sm text-neutral-400">
          {formatRelativeActivity(processes.generatedAt)} · read-only view
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-4">
          <Toolbar>
            <Field label="Workflow">
              <select
                className={selectClassName}
                value={workflowId}
                onChange={(e) => {
                  setWorkflowId(e.target.value);
                  setSelectedStepId(null);
                  setPan({ x: 0, y: 0 });
                }}
              >
                {processes.workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="View">
              <select
                className={selectClassName}
                value={view}
                onChange={(e) => setView(e.target.value as ProcessViewKind)}
              >
                {(Object.keys(VIEW_LABELS) as ProcessViewKind[]).map((k) => (
                  <option key={k} value={k}>
                    {VIEW_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            {view === "department" ? (
              <Field label="Department">
                <select
                  className={selectClassName}
                  value={departmentFilter ?? ""}
                  onChange={(e) =>
                    setDepartmentFilter(e.target.value || null)
                  }
                >
                  <option value="">All</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Overlay">
              <select
                className={selectClassName}
                value={overlay}
                onChange={(e) =>
                  setOverlay(e.target.value as ProcessOverlayKind)
                }
              >
                {(Object.keys(OVERLAY_LABELS) as ProcessOverlayKind[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {OVERLAY_LABELS[k]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Highlight">
              <select
                className={selectClassName}
                value={highlight}
                onChange={(e) =>
                  setHighlight(
                    e.target.value as
                      | "none"
                      | "actor"
                      | "document"
                      | "approval"
                      | "bottleneck",
                  )
                }
              >
                <option value="none">None</option>
                <option value="actor">Actor</option>
                <option value="document">Document</option>
                <option value="approval">Approval</option>
                <option value="bottleneck">Bottleneck</option>
              </select>
            </Field>
          </Toolbar>

          <Legend overlay={overlay} />

          <div
            className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-b from-stone-50/80 to-white"
            style={{ height: 520 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => {
              e.preventDefault();
              setZoom((z) =>
                Math.min(1.8, Math.max(0.55, z - e.deltaY * 0.001)),
              );
            }}
          >
            <div className="absolute right-4 top-4 z-10 flex gap-2">
              <IconButton
                label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.55, z - 0.1))}
              >
                −
              </IconButton>
              <IconButton
                label="Reset"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                {Math.round(zoom * 100)}%
              </IconButton>
              <IconButton
                label="Zoom in"
                onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
              >
                +
              </IconButton>
            </div>

            <div
              className="origin-top-left will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                width: viz.bounds.width,
                height: viz.bounds.height,
                position: "relative",
              }}
            >
              {viz.lanes.map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  className="absolute rounded-2xl border border-neutral-200/70 bg-stone-50/60 text-left transition-colors hover:bg-stone-100/70"
                  style={{
                    left: (() => {
                      const node = viz.nodes.find((n) =>
                        lane.stepIds.includes(n.stepId),
                      );
                      return (node?.x ?? 48) - 16;
                    })(),
                    top: lane.y,
                    width: 252,
                    height: lane.height,
                  }}
                  onClick={() => toggleCollapse(lane.department)}
                >
                  <span className="block px-4 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                    {lane.label}
                    {collapsed.has(lane.department) ? " · expand" : " · collapse"}
                  </span>
                </button>
              ))}

              <svg
                className="pointer-events-none absolute inset-0"
                width={viz.bounds.width}
                height={viz.bounds.height}
              >
                {viz.edges.map((edge) => {
                  const from = viz.nodes.find((n) => n.id === edge.fromNodeId);
                  const to = viz.nodes.find((n) => n.id === edge.toNodeId);
                  if (!from || !to) return null;
                  const x1 = from.x + from.width / 2;
                  const y1 = from.y + from.height;
                  const x2 = to.x + to.width / 2;
                  const y2 = to.y;
                  const midY = (y1 + y2) / 2;
                  const path =
                    Math.abs(x1 - x2) < 4
                      ? `M ${x1} ${y1} L ${x2} ${y2}`
                      : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                  return (
                    <path
                      key={edge.id}
                      d={path}
                      fill="none"
                      stroke={
                        edge.kind === "handoff"
                          ? "rgba(15,23,42,0.45)"
                          : "rgba(15,23,42,0.2)"
                      }
                      strokeWidth={edge.kind === "handoff" ? 1.75 : 1.25}
                      strokeDasharray={
                        edge.kind === "handoff" ? "0" : undefined
                      }
                      markerEnd="url(#arrow)"
                    />
                  );
                })}
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(15,23,42,0.35)" />
                  </marker>
                </defs>
              </svg>

              <AnimatePresence>
                {viz.nodes.map((node) => {
                  const selected = selectedStepId === node.stepId;
                  const hovered = hoveredStepId === node.stepId;
                  const highlighted = isHighlighted(node);
                  const surface = nodeSurfaceStyle(overlay, node, {
                    selected,
                    highlighted: highlighted || hovered,
                    dimmed: highlight !== "none" && !highlighted,
                  });
                  return (
                    <motion.button
                      key={node.id}
                      type="button"
                      data-viz-node
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: surface.opacity, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute rounded-2xl border px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: node.width,
                        height: node.height,
                        background: surface.background,
                        borderColor: surface.borderColor,
                        color: surface.color,
                      }}
                      onMouseEnter={() => setHoveredStepId(node.stepId)}
                      onMouseLeave={() => setHoveredStepId(null)}
                      onClick={() => {
                        setSelectedStepId(node.stepId);
                        if (node.collapsed && node.department) {
                          toggleCollapse(node.department);
                        }
                      }}
                    >
                      <span className="block truncate text-[13px] font-medium tracking-tight">
                        {node.label}
                      </span>
                      <span
                        className="mt-1 block truncate text-[11px]"
                        style={{
                          color: selected
                            ? "rgba(250,250,250,0.7)"
                            : "#a3a3a3",
                        }}
                      >
                        {node.collapsed
                          ? "Group"
                          : overlay === "time"
                            ? node.durationLabel ?? "Duration unknown"
                            : overlay === "automation"
                              ? AUTOMATION_COLORS[node.automation].badge
                              : overlay === "pain"
                                ? PAIN_COLORS[node.pain].label
                                : node.actor}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {overlay === "dependency" && deps ? (
            <Card className="px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Dependencies · {selectedStep?.name ?? "Select a step"}
              </p>
              <DependencyList title="Requires" items={deps.inputs} />
              <DependencyList title="Documents" items={deps.documents} />
              <DependencyList title="Systems" items={deps.systems} />
              <DependencyList title="Roles" items={deps.roles} />
              <DependencyList title="Approvals" items={deps.approvals} />
              <DependencyList title="Policies" items={deps.policies} />
            </Card>
          ) : null}
        </div>

        <MetricsSidebar metrics={viz.metrics} />
      </div>
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 rounded-3xl border border-neutral-200/80 bg-white/80 px-4 py-3">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="min-w-[140px] flex-1">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Legend({ overlay }: { overlay: ProcessOverlayKind }) {
  if (overlay === "none" || overlay === "time" || overlay === "dependency") {
    return (
      <p className="text-xs text-neutral-400">
        Hover a step · click to select · scroll to zoom · drag canvas to pan ·
        click lane headers to collapse
      </p>
    );
  }
  if (overlay === "pain") {
    return (
      <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
        {(Object.keys(PAIN_COLORS) as Array<keyof typeof PAIN_COLORS>).map(
          (k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: PAIN_COLORS[k].ring }}
              />
              {PAIN_COLORS[k].emoji} {PAIN_COLORS[k].label}
            </span>
          ),
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
      {(
        Object.keys(AUTOMATION_COLORS) as Array<keyof typeof AUTOMATION_COLORS>
      ).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: AUTOMATION_COLORS[k].ring }}
          />
          {AUTOMATION_COLORS[k].label}
        </span>
      ))}
    </div>
  );
}

function MetricsSidebar({
  metrics,
}: {
  metrics: NonNullable<
    ReturnType<typeof deriveProcessVisualization>
  >["metrics"];
}) {
  const rows: Array<[string, string]> = [
    ["Total steps", String(metrics.totalSteps)],
    ["Departments", String(metrics.departments)],
    ["Manual steps", String(metrics.manualSteps)],
    ["Automation opportunities", String(metrics.automationOpportunities)],
    ["Approvals", String(metrics.approvals)],
    ["Documents", String(metrics.documents)],
    ["Average duration", metrics.averageDurationLabel],
    ["Risk level", metrics.riskLevel],
    ["Process health", healthLabel(metrics.processHealth)],
    ["Coverage", coverageBand(metrics.coverage, "unit")],
  ];

  return (
    <aside className="h-fit rounded-3xl border border-neutral-200/80 bg-white/90 px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
        Snapshot
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <li
            key={label}
            className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-2 last:border-0"
          >
            <span className="text-xs text-neutral-500">{label}</span>
            <span className="text-sm font-medium text-neutral-900">{value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">
        Derived from discovered workflows — never manually entered.
      </p>
    </aside>
  );
}

function DependencyList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-neutral-700">
            ✓ {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm backdrop-blur"
    >
      {children}
    </button>
  );
}
