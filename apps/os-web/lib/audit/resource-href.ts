import { partyHref } from '@/lib/party/navigation';
import { issueHref } from '@/lib/issue/navigation';

/** Deep link when a durable in-app route exists; otherwise null (no invented URLs). */
export function auditResourceHref(resourceType: string, resourceId: string): string | null {
  switch (resourceType) {
    case 'party':
      return partyHref(resourceId);
    case 'member':
      return `/administracion/equipo/${encodeURIComponent(resourceId)}`;
    case 'issue':
      return issueHref(resourceId);
    case 'work_item':
      return `/trabajo?subjectType=work_item&subjectId=${encodeURIComponent(resourceId)}`;
    case 'approval_request':
      return '/aprobaciones';
    case 'quote':
      return `/cotizaciones/${encodeURIComponent(resourceId)}`;
    case 'order':
      return null;
    case 'opportunity':
      return `/oportunidades/${encodeURIComponent(resourceId)}`;
    case 'commitment':
      return `/trabajo?subjectType=commitment&subjectId=${encodeURIComponent(resourceId)}`;
    default:
      return null;
  }
}
