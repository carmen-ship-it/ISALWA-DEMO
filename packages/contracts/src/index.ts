import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('isalwa-api'),
  version: z.string(),
  timestamp: z.string().datetime(),
  environment: z.string(),
  checks: z.object({
    api: z.literal('up'),
    database: z.enum(['up', 'down', 'skipped']),
    providers: z.object({
      messaging: z.string(),
      maps: z.string(),
      ai: z.string(),
      storage: z.string(),
      search: z.string(),
      pdf: z.string(),
      email: z.string(),
    }),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PERMISSIONS = [
  'accounts.read',
  'accounts.write',
  'quotes.read',
  'quotes.write',
  'quotes.send',
  'visits.checkin',
  'wa.inbox',
  'reports.executive',
  'admin.users',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const EXPERIENCE_ROUTES = {
  pulso: '/pulso',
  radar: '/radar',
  personas: '/personas',
  territorio: '/territorio',
  senal: '/senal',
  cierre: '/cierre',
  memoria: '/memoria',
} as const;

export const DEMO_HEROES = {
  casaCeramica: 'H-VIP-001',
  valleAndino: 'H-DEBT-001',
  donJulio: 'H-SILENT-001',
  tanquesNorte: 'H-TANK-001',
  negociaYa: 'H-NEG-001',
} as const;

export const PulseResponseSchema = z.object({
  asOf: z.string(),
  sentence: z.string(),
  vitals: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      valueLabel: z.string(),
      hint: z.string(),
      tone: z.enum(['neutral', 'success', 'warning', 'danger', 'info']),
    }),
  ),
  focus: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      reason: z.string(),
      href: z.string(),
      score: z.number(),
    }),
  ),
});

export type PulseResponse = z.infer<typeof PulseResponseSchema>;

/** Mission 17 — commercial timeline contracts (also `@isalwa/contracts/events`) */
export * from './events/index';
