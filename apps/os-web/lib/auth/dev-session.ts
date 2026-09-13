import { z } from 'zod';

export const DevSessionSchema = z.object({
  organizationId: z.string().min(1),
  memberId: z.string().min(1),
  personId: z.string().min(1),
  authIdentityId: z.string().min(1),
  displayLabel: z.string().optional(),
});

export type DevSession = z.infer<typeof DevSessionSchema>;

export function encodeDevSession(session: DevSession): string {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
}

export function decodeDevSession(raw: string | undefined | null): DevSession | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = DevSessionSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function devSessionHeaders(session: DevSession): Record<string, string> {
  return {
    'x-os-organization-id': session.organizationId,
    'x-os-member-id': session.memberId,
    'x-os-person-id': session.personId,
    'x-os-auth-identity-id': session.authIdentityId,
  };
}
