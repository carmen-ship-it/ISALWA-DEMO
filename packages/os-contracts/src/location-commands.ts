import { z } from 'zod';

export const LOCATION_COMMAND_NAMES = [
  'CreateLocation',
  'UpdateLocation',
  'DeactivateLocation',
] as const;

export type LocationCommandName = (typeof LOCATION_COMMAND_NAMES)[number];

function refineCoordPair(
  value: { latitude?: number | null; longitude?: number | null },
  ctx: z.RefinementCtx,
): void {
  const hasLatKey = value.latitude !== undefined;
  const hasLngKey = value.longitude !== undefined;
  if (hasLatKey !== hasLngKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'latitude and longitude must both be provided together',
    });
    return;
  }
  if (!hasLatKey) return;
  const hasLat = value.latitude !== null;
  const hasLng = value.longitude !== null;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'latitude and longitude must both be set or both be null',
    });
  }
}

export const CreateLocationPayloadSchema = z
  .object({
    partyId: z.string().min(1),
    label: z.string().min(1),
    addressText: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    /** Google Maps / short link — provenance only; may exist without coordinates. */
    provenanceUrl: z.string().url().optional(),
  })
  .superRefine(refineCoordPair);

export const UpdateLocationPayloadSchema = z
  .object({
    locationId: z.string().min(1),
    label: z.string().min(1).optional(),
    addressText: z.string().min(1).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    provenanceUrl: z.string().url().nullable().optional(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .superRefine(refineCoordPair);

export const DeactivateLocationPayloadSchema = z.object({
  locationId: z.string().min(1),
});

export const LOCATION_COMMAND_PAYLOAD_SCHEMAS: Record<LocationCommandName, z.ZodTypeAny> = {
  CreateLocation: CreateLocationPayloadSchema,
  UpdateLocation: UpdateLocationPayloadSchema,
  DeactivateLocation: DeactivateLocationPayloadSchema,
};
