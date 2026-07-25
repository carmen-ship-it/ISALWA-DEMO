export function formatRelativeActivity(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`;
  }
  return date.toLocaleDateString("es", {
    month: "short",
    day: "numeric",
  });
}

export function formatStageLabel(stage: string): string {
  const map: Record<string, string> = {
    Discovery: "Descubrimiento",
    Design: "Diseño",
    Delivery: "Entrega",
    Review: "Revisión",
  };
  return map[stage] ?? stage;
}

export function formatIndustryLabel(industry: string): string {
  const map: Record<string, string> = {
    manufacturing: "Manufactura",
    construction: "Construcción",
    distribution: "Distribución",
    services: "Servicios",
    retail: "Retail",
    healthcare: "Salud",
    unknown: "Industria por clasificar",
  };
  return map[industry] ?? industry;
}
