import type { ProcessMetrics, ProcessStep } from "@/types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

export function deriveMetrics(input: {
  steps: ProcessStep[];
  systems: string[];
  exceptions: string[];
  painPoints: string[];
  metricsListed: string[];
}): ProcessMetrics {
  const { steps, systems, exceptions, painPoints, metricsListed } = input;
  const count = Math.max(steps.length, 1);
  const manualCount = steps.filter((s) => s.manual).length;
  const automatedCount = steps.filter((s) => s.automated).length;
  const unknownCount = steps.filter(
    (s) =>
      s.actorUnknown ||
      s.inputs.some((i) => /^unknown/i.test(i)) ||
      s.outputs.some((o) => /^unknown/i.test(o)),
  ).length;
  const highRisk = steps.filter(
    (s) => s.riskLevel === "high" || s.riskLevel === "critical",
  ).length;
  const aiReady = steps.filter((s) => s.aiOpportunity != null).length;
  const withSystems = steps.filter((s) => s.systemsUsed.length > 0).length;

  const complexity = clamp01(
    (steps.length / 12) * 0.45 +
      (exceptions.length / 4) * 0.25 +
      (painPoints.length / 5) * 0.3,
  );

  const automationScore = clamp01(automatedCount / count);
  const documentationScore = clamp01(
    1 - unknownCount / count + (metricsListed.length > 0 ? 0.1 : 0),
  );
  const riskScore = clamp01(
    (highRisk / count) * 0.6 + (manualCount / count) * 0.4,
  );
  const aiReadiness = clamp01(aiReady / count);
  const systemSupport = clamp01(
    (withSystems / count) * 0.7 + (systems.length > 0 ? 0.3 : 0),
  );

  const confidence = clamp01(
    0.55 +
      (steps.length > 0 ? 0.2 : 0) +
      (unknownCount === 0 ? 0.15 : 0) -
      unknownCount * 0.03,
  );

  return {
    complexity,
    automationScore,
    documentationScore,
    riskScore,
    aiReadiness,
    systemSupport,
    confidence,
  };
}
