import { NotificationDrawerHost } from '@/components/notifications/notification-drawer';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';

/**
 * Integrator mount for UX-5 bell/drawer while UX-1 nav lane remains parked.
 * Loads Attention only — no shell/nav restructuring.
 */
export async function ShellNotificationSlot() {
  const auth = await getServerOsAuthContext().catch(() => null);
  if (!auth) return null;

  const client = createOsApiClient(auth);
  let organizationId = '';
  let recipientMemberId = '';
  try {
    const session = await client.getAuthenticatedSession();
    organizationId = session.organizationId?.trim() ?? '';
    recipientMemberId = session.memberId?.trim() ?? '';
  } catch {
    return null;
  }
  if (!organizationId || !recipientMemberId) return null;

  let attention: Awaited<ReturnType<typeof client.listAttention>>['items'] = [];
  let work: Awaited<ReturnType<typeof client.listWorkItems>>['items'] = [];
  try {
    const page = await client.listAttention({ activeOnly: true, limit: 40 });
    attention = page.items ?? [];
  } catch {
    attention = [];
  }
  try {
    const page = await client.listWorkItems({ limit: 40 });
    work = page.items ?? [];
  } catch {
    work = [];
  }

  return (
    <NotificationDrawerHost
      organizationId={organizationId}
      recipientMemberId={recipientMemberId}
      attention={attention}
      work={work}
    />
  );
}
