export function formatOpportunityStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Abierta';
    case 'won':
      return 'Ganada';
    case 'lost':
      return 'Perdida';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

export function formatQuoteStatus(status: string): string {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'submitted':
      return 'Enviada';
    case 'accepted':
      return 'Aceptada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

export function formatOrderStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Registrado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

export function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ');
}

export function statusTone(
  status: string,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'won' || status === 'accepted' || status === 'open') return 'success';
  if (status === 'submitted') return 'info';
  if (status === 'lost' || status === 'cancelled') return 'danger';
  if (status === 'draft') return 'neutral';
  return 'neutral';
}

export function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
