import { NOTIFICATION_PERSISTENCE_BLOCKER, type InternalNotification } from '@isalwa/os-contracts';

export type NotificationNotPersisted = {
  ok: false;
  persisted: false;
  reason: typeof NOTIFICATION_PERSISTENCE_BLOCKER;
};

/**
 * Honest port. Read state is not written. There is no email or push send.
 */
export function notificationPersistence(): {
  persistence: 'not_persisted';
  save(notification: InternalNotification): Promise<NotificationNotPersisted>;
  list(query: { organizationId: string; recipientMemberId: string }): Promise<NotificationNotPersisted>;
  markRead(notificationId: string, readAt: string): Promise<NotificationNotPersisted>;
} {
  return {
    persistence: 'not_persisted',
    async save(_notification) {
      return { ok: false, persisted: false, reason: NOTIFICATION_PERSISTENCE_BLOCKER };
    },
    async list(_query) {
      return { ok: false, persisted: false, reason: NOTIFICATION_PERSISTENCE_BLOCKER };
    },
    async markRead(_notificationId, _readAt) {
      return { ok: false, persisted: false, reason: NOTIFICATION_PERSISTENCE_BLOCKER };
    },
  };
}
