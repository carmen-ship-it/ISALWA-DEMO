import type { AutomationTone, PainTone, ProcessOverlayKind } from "./types";

/** Soft, instrument-quality tokens — not Visio / BPMN chrome. */
export const VIZ_TOKENS = {
  canvas: {
    background: "transparent",
    grid: "rgba(15, 23, 42, 0.04)",
  },
  node: {
    fill: "rgba(255, 255, 255, 0.92)",
    border: "rgba(15, 23, 42, 0.08)",
    text: "#0a0a0a",
    muted: "#737373",
    selected: "rgba(15, 23, 42, 0.92)",
    selectedText: "#fafafa",
    hover: "rgba(15, 23, 42, 0.04)",
  },
  edge: {
    sequence: "rgba(15, 23, 42, 0.22)",
    handoff: "rgba(15, 23, 42, 0.45)",
  },
  lane: {
    fill: "rgba(250, 250, 249, 0.7)",
    border: "rgba(15, 23, 42, 0.06)",
    label: "#737373",
  },
} as const;

export const PAIN_COLORS: Record<
  PainTone,
  { fill: string; ring: string; label: string; emoji: string }
> = {
  healthy: {
    fill: "rgba(34, 197, 94, 0.12)",
    ring: "rgba(34, 197, 94, 0.55)",
    label: "Saludable",
    emoji: "🟢",
  },
  attention: {
    fill: "rgba(234, 179, 8, 0.14)",
    ring: "rgba(234, 179, 8, 0.6)",
    label: "Atención",
    emoji: "🟡",
  },
  bottleneck: {
    fill: "rgba(249, 115, 22, 0.14)",
    ring: "rgba(249, 115, 22, 0.65)",
    label: "Cuello de botella",
    emoji: "🟠",
  },
  critical: {
    fill: "rgba(239, 68, 68, 0.14)",
    ring: "rgba(239, 68, 68, 0.7)",
    label: "Crítico",
    emoji: "🔴",
  },
};

export const AUTOMATION_COLORS: Record<
  AutomationTone,
  { fill: string; ring: string; label: string; badge: string }
> = {
  manual: {
    fill: "rgba(115, 115, 115, 0.08)",
    ring: "rgba(115, 115, 115, 0.35)",
    label: "Manual",
    badge: "Manual",
  },
  ai_opportunity: {
    fill: "rgba(99, 102, 241, 0.1)",
    ring: "rgba(99, 102, 241, 0.45)",
    label: "Oportunidad de IA",
    badge: "IA",
  },
  automation: {
    fill: "rgba(16, 185, 129, 0.1)",
    ring: "rgba(16, 185, 129, 0.45)",
    label: "Automatización",
    badge: "Auto",
  },
  human_approval: {
    fill: "rgba(245, 158, 11, 0.12)",
    ring: "rgba(245, 158, 11, 0.5)",
    label: "Aprobación humana",
    badge: "Aprobar",
  },
};

export function nodeSurfaceStyle(
  overlay: ProcessOverlayKind,
  node: { pain: PainTone; automation: AutomationTone; isApproval: boolean },
  state: { selected: boolean; highlighted: boolean; dimmed: boolean },
): {
  background: string;
  borderColor: string;
  opacity: number;
  color: string;
} {
  if (state.selected) {
    return {
      background: VIZ_TOKENS.node.selected,
      borderColor: VIZ_TOKENS.node.selected,
      opacity: 1,
      color: VIZ_TOKENS.node.selectedText,
    };
  }

  let background: string = VIZ_TOKENS.node.fill;
  let borderColor: string = VIZ_TOKENS.node.border;

  if (overlay === "pain") {
    background = PAIN_COLORS[node.pain].fill;
    borderColor = PAIN_COLORS[node.pain].ring;
  } else if (overlay === "automation") {
    background = AUTOMATION_COLORS[node.automation].fill;
    borderColor = AUTOMATION_COLORS[node.automation].ring;
  }

  return {
    background,
    borderColor,
    opacity: state.dimmed ? 0.28 : state.highlighted ? 1 : 0.96,
    color: VIZ_TOKENS.node.text,
  };
}

export const VIEW_LABELS: Record<string, string> = {
  executive: "Flujo ejecutivo",
  swimlane: "Carriles por rol",
  department: "Por departamento",
};

export const OVERLAY_LABELS: Record<ProcessOverlayKind, string> = {
  none: "Ninguna",
  pain: "Dolor / Riesgo",
  automation: "Automatización",
  time: "Tiempo",
  dependency: "Dependencias",
};
