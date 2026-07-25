import type {
  ProcessViewKind,
  VizEdge,
  VizLane,
  VizNode,
} from "./types";
import { departmentFromActor } from "./graph";

const NODE_W = 220;
const NODE_H = 72;
const EXEC_GAP_Y = 56;
const EXEC_X = 80;
const LANE_PAD_X = 48;
const LANE_GAP_X = 36;
const LANE_HEADER = 40;
const LANE_PAD_Y = 24;
const SWIM_GAP_Y = 28;

type LaidOut = {
  nodes: VizNode[];
  edges: VizEdge[];
  lanes: VizLane[];
  bounds: { width: number; height: number };
};

/**
 * Deterministic layouts only — no force-directed / AI layout.
 * Positions are pure functions of step order + department lanes.
 */
export function layoutProcessGraph(input: {
  view: ProcessViewKind;
  departmentFilter: string | null;
  baseNodes: Array<
    Omit<VizNode, "x" | "y" | "width" | "height" | "laneIndex" | "collapsed">
  >;
  edges: VizEdge[];
  collapsedGroups: Set<string>;
}): LaidOut {
  const withDept = input.baseNodes.map((n) => ({
    ...n,
    department: departmentFromActor(n.actor) ?? "Unknown",
  }));

  if (input.view === "executive") {
    return layoutExecutive(withDept, input.edges, input.collapsedGroups);
  }
  if (input.view === "department") {
    return layoutDepartment(
      withDept,
      input.edges,
      input.departmentFilter,
      input.collapsedGroups,
    );
  }
  return layoutSwimlane(withDept, input.edges, input.collapsedGroups);
}

function layoutExecutive(
  base: Array<Omit<VizNode, "x" | "y" | "width" | "height" | "laneIndex" | "collapsed"> & { department: string }>,
  edges: VizEdge[],
  collapsed: Set<string>,
): LaidOut {
  const nodes: VizNode[] = [];
  let y = 32;
  const ordered = [...base].sort((a, b) => a.order - b.order);

  for (const n of ordered) {
    const isCollapsed = collapsed.has(n.department);
    if (isCollapsed && nodes.some((x) => x.department === n.department)) {
      continue;
    }
    nodes.push({
      ...n,
      x: EXEC_X,
      y,
      width: NODE_W,
      height: isCollapsed ? 48 : NODE_H,
      laneIndex: 0,
      collapsed: isCollapsed,
      label: isCollapsed ? `${n.department} (collapsed)` : n.label,
    });
    y += (isCollapsed ? 48 : NODE_H) + EXEC_GAP_Y;
  }

  return {
    nodes,
    edges: filterEdges(edges, nodes),
    lanes: [],
    bounds: {
      width: EXEC_X + NODE_W + 80,
      height: Math.max(y, 200),
    },
  };
}

function layoutSwimlane(
  base: Array<Omit<VizNode, "x" | "y" | "width" | "height" | "laneIndex" | "collapsed"> & { department: string }>,
  edges: VizEdge[],
  collapsed: Set<string>,
): LaidOut {
  const deptOrder = uniqueDepts(base);
  const lanes: VizLane[] = [];
  const nodes: VizNode[] = [];
  let x = LANE_PAD_X;

  deptOrder.forEach((dept, laneIndex) => {
    const laneSteps = base
      .filter((n) => n.department === dept)
      .sort((a, b) => a.order - b.order);
    const isCollapsed = collapsed.has(dept);
    const contentH = isCollapsed
      ? 56
      : LANE_HEADER +
        LANE_PAD_Y +
        laneSteps.length * (NODE_H + SWIM_GAP_Y) +
        LANE_PAD_Y;

    lanes.push({
      id: `lane_${dept}`,
      label: dept,
      department: dept,
      y: 24,
      height: contentH,
      stepIds: laneSteps.map((s) => s.stepId),
    });

    if (isCollapsed) {
      nodes.push({
        ...laneSteps[0],
        id: `vnode_collapsed_${dept}`,
        label: `${dept} · ${laneSteps.length} steps`,
        x,
        y: 24 + LANE_HEADER,
        width: NODE_W,
        height: 48,
        laneIndex,
        collapsed: true,
        department: dept,
      });
    } else {
      let y = 24 + LANE_HEADER + LANE_PAD_Y;
      for (const n of laneSteps) {
        nodes.push({
          ...n,
          x,
          y,
          width: NODE_W,
          height: NODE_H,
          laneIndex,
          collapsed: false,
        });
        y += NODE_H + SWIM_GAP_Y;
      }
    }

    x += NODE_W + LANE_GAP_X;
  });

  const maxH = Math.max(...lanes.map((l) => l.height), 200);
  return {
    nodes,
    edges: filterEdges(edges, nodes),
    lanes: lanes.map((l) => ({ ...l, height: maxH })),
    bounds: {
      width: Math.max(x + LANE_PAD_X, 480),
      height: maxH + 48,
    },
  };
}

function layoutDepartment(
  base: Array<Omit<VizNode, "x" | "y" | "width" | "height" | "laneIndex" | "collapsed"> & { department: string }>,
  edges: VizEdge[],
  filter: string | null,
  collapsed: Set<string>,
): LaidOut {
  const depts = filter
    ? [filter]
    : uniqueDepts(base);

  const lanes: VizLane[] = [];
  const nodes: VizNode[] = [];
  let x = LANE_PAD_X;

  depts.forEach((dept, laneIndex) => {
    const laneSteps = base
      .filter((n) => n.department === dept)
      .sort((a, b) => a.order - b.order);
    if (laneSteps.length === 0) return;

    const isCollapsed = collapsed.has(dept);
    let y = 48;
    lanes.push({
      id: `dept_${dept}`,
      label: dept,
      department: dept,
      y: 16,
      height: 0,
      stepIds: laneSteps.map((s) => s.stepId),
    });

    if (isCollapsed) {
      nodes.push({
        ...laneSteps[0],
        id: `vnode_collapsed_${dept}`,
        label: `${dept} (collapsed)`,
        x,
        y,
        width: NODE_W,
        height: 48,
        laneIndex,
        collapsed: true,
      });
      y += 48 + EXEC_GAP_Y;
    } else {
      for (const n of laneSteps) {
        nodes.push({
          ...n,
          x,
          y,
          width: NODE_W,
          height: NODE_H,
          laneIndex,
          collapsed: false,
        });
        y += NODE_H + EXEC_GAP_Y;
      }
    }

    lanes[lanes.length - 1].height = y;
    x += NODE_W + LANE_GAP_X + 24;
  });

  return {
    nodes,
    edges: filterEdges(edges, nodes),
    lanes,
    bounds: {
      width: Math.max(x, 400),
      height: Math.max(...lanes.map((l) => l.height), 240),
    },
  };
}

function uniqueDepts(
  nodes: Array<{ department: string; order: number }>,
): string[] {
  const firstOrder = new Map<string, number>();
  for (const n of nodes) {
    const prev = firstOrder.get(n.department);
    if (prev == null || n.order < prev) firstOrder.set(n.department, n.order);
  }
  return [...firstOrder.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([d]) => d);
}

function filterEdges(edges: VizEdge[], nodes: VizNode[]): VizEdge[] {
  const ids = new Set(nodes.map((n) => n.id));
  // Map collapsed: if step node missing, drop edge (collapsed groups hide internals)
  return edges.filter((e) => ids.has(e.fromNodeId) && ids.has(e.toNodeId));
}
