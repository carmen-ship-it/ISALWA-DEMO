import { z } from 'zod';
import {
  IMPORT_PHONE_DECISIONS,
  IMPORT_SOURCE_KINDS,
  type ImportPhoneReviewList,
  type ImportPhoneValueResolution,
  type ImportReceipt,
  type ImportReceiptView,
} from './import-types';
import { CONTACT_PHONE_COUNTRIES } from './party-commands';

export const IMPORT_COMMAND_NAMES = [
  'DryRunClientImport',
  'ValidateClientImport',
  'ExecuteClientImport',
  'ReverseImportBatch',
  'GetImportBatchReceipt',
  'ListImportPhoneReview',
  'ResolveImportPhoneValue',
] as const;

export type ImportCommandName = (typeof IMPORT_COMMAND_NAMES)[number];

/** `data` of each import command result (`{ commandId, correlationId, data }`). */
export type ImportCommandResultData = {
  DryRunClientImport: ImportReceipt;
  ValidateClientImport: ImportReceipt;
  ExecuteClientImport: ImportReceipt;
  ReverseImportBatch: ImportReceipt;
  GetImportBatchReceipt: ImportReceiptView;
  ListImportPhoneReview: ImportPhoneReviewList;
  ResolveImportPhoneValue: ImportPhoneValueResolution;
};

const StaffRowSchema = z.object({
  section: z.literal('A'),
  rowIndex: z.number().int().nonnegative(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  email: z.string().email().optional(),
  cargo: z.string().optional(),
});

const CustomerRowSchema = z.object({
  section: z.literal('B'),
  rowIndex: z.number().int().nonnegative(),
  commercialName: z.string().min(1),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  celular: z.union([z.string(), z.number()]).optional(),
  telefono: z.union([z.string(), z.number()]).optional(),
  mapsUrl: z.string().optional(),
  /** Reserved for future extracts — not present in DATOS CLIENTES workbook. */
  nit: z.string().optional(),
});

export const ImportInputRowSchema = z.discriminatedUnion('section', [
  StaffRowSchema,
  CustomerRowSchema,
]);

export type ImportInputRow = z.infer<typeof ImportInputRowSchema>;

const ImportBatchInputSchema = z.object({
  sourceKind: z.enum(IMPORT_SOURCE_KINDS).default('xls_datos_clientes'),
  sourceFingerprint: z.string().min(1),
  /** Country of every phone in the batch. Omitted means Bolivia, recorded as a default in the receipt. */
  phoneCountry: z.enum(CONTACT_PHONE_COUNTRIES).optional(),
  rows: z.array(ImportInputRowSchema).min(1),
});

export const DryRunClientImportPayloadSchema = ImportBatchInputSchema;
export const ValidateClientImportPayloadSchema = ImportBatchInputSchema;

export const ExecuteClientImportPayloadSchema = z.object({
  importBatchId: z.string().min(1),
});

export const ReverseImportBatchPayloadSchema = z.object({
  importBatchId: z.string().min(1),
});

export const GetImportBatchReceiptPayloadSchema = z.object({
  importBatchId: z.string().min(1),
});

export const ListImportPhoneReviewPayloadSchema = z.object({
  importBatchId: z.string().min(1),
});

export const ResolveImportPhoneValuePayloadSchema = z
  .object({
    importBatchId: z.string().min(1),
    rowIndex: z.number().int().nonnegative(),
    /** `celular:<n>` or `telefono:<n>`, as listed by ListImportPhoneReview. */
    valueId: z.string().regex(/^(celular|telefono):\d{1,3}$/),
    /** Review version of the row as listed; a stale version is refused. */
    expectedVersion: z.number().int().nonnegative(),
    decision: z.enum(IMPORT_PHONE_DECISIONS),
    correctedNumber: z.string().trim().min(1).max(40).optional(),
    reason: z.string().trim().min(10).max(500),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'correct' && !value.correctedNumber) {
      ctx.addIssue({ code: 'custom', path: ['correctedNumber'], message: 'required to correct' });
    }
    if (value.decision === 'omit' && value.correctedNumber) {
      ctx.addIssue({ code: 'custom', path: ['correctedNumber'], message: 'not allowed when omitting' });
    }
  });

export const IMPORT_COMMAND_PAYLOAD_SCHEMAS: Record<ImportCommandName, z.ZodTypeAny> = {
  DryRunClientImport: DryRunClientImportPayloadSchema,
  ValidateClientImport: ValidateClientImportPayloadSchema,
  ExecuteClientImport: ExecuteClientImportPayloadSchema,
  ReverseImportBatch: ReverseImportBatchPayloadSchema,
  GetImportBatchReceipt: GetImportBatchReceiptPayloadSchema,
  ListImportPhoneReview: ListImportPhoneReviewPayloadSchema,
  ResolveImportPhoneValue: ResolveImportPhoneValuePayloadSchema,
};
