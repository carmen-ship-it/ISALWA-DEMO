'use server';

import type { InternalNotification } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type NotificationStampResult =
  | { ok: true; item: InternalNotification }
  | { ok: false; reason: 'session_expired' | 'view_as_blocked' | 'api_error' };

async function stamp(
  notificationId: string,
  call: (client: ReturnType<typeof createOsApiClient>, id: string) => Promise<{ item: InternalNotification }>,
): Promise<NotificationStampResult> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return { ok: false, reason: 'view_as_blocked' };
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, reason: 'session_expired' };
  try {
    const { item } = await call(createOsApiClient(auth), notificationId);
    return { ok: true, item };
  } catch {
    return { ok: false, reason: 'api_error' };
  }
}

/** Seen. Does not acknowledge the notice and does not resolve it. */
export async function markNotificationReadAction(notificationId: string): Promise<NotificationStampResult> {
  return stamp(notificationId, (client, id) => client.markNotificationRead(id));
}

/** The member took it on ("Enterado"). Separate from read; never resolves the notice. */
export async function acknowledgeNotificationAction(notificationId: string): Promise<NotificationStampResult> {
  return stamp(notificationId, (client, id) => client.acknowledgeNotification(id));
}
