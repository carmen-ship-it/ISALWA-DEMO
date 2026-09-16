import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { QA_VIEW_COOKIE_NAME, QA_VIEW_TTL_SECONDS } from '@/lib/qa/constants';

export { QA_VIEW_COOKIE_NAME };

const PayloadSchema = z.object({
  actingMemberId: z.string().min(1),
  targetMemberId: z.string().min(1),
  synthOrgId: z.string().min(1),
  exp: z.number().int().positive(),
});

export type QaViewPayload = z.infer<typeof PayloadSchema>;

function signingSecret(): string | null {
  const qa = process.env.OS_QA_SIGNING_SECRET?.trim();
  if (qa) return qa;
  const jwt = process.env.SUPABASE_JWT_SECRET?.trim();
  return jwt || null;
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function createSignedQaViewCookieValue(
  payload: Omit<QaViewPayload, 'exp'>,
  nowSeconds = Math.floor(Date.now() / 1000),
): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const full: QaViewPayload = {
    ...payload,
    exp: nowSeconds + QA_VIEW_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const sig = signPayload(encoded, secret);
  return `${encoded}.${sig}`;
}

export function parseSignedQaViewCookie(raw: string | undefined | null): QaViewPayload | null {
  if (!raw) return null;
  const secret = signingSecret();
  if (!secret) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = signPayload(encoded, secret);
  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = PayloadSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    if (parsed.data.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function qaViewCookieOptions(expSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(expSeconds * 1000),
  };
}
