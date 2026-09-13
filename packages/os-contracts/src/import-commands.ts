import { z } from 'zod';
import { IMPORT_SOURCE_KINDS } from './import-types';

export const IMPORT_COMMAND_NAMES = [
  'DryRunClientImport',
  'ValidateClientImport',
  'ExecuteClientImport',
  'ReverseImportBatch',
  'GetImportBatchReceipt',
] as const;

export type ImportCommandName = (typeof IMPORT_COMMAND_NAMES)[number];

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

export const IMPORT_COMMAND_PAYLOAD_SCHEMAS: Record<ImportCommandName, z.ZodTypeAny> = {
  DryRunClientImport: DryRunClientImportPayloadSchema,
  ValidateClientImport: ValidateClientImportPayloadSchema,
  ExecuteClientImport: ExecuteClientImportPayloadSchema,
  ReverseImportBatch: ReverseImportBatchPayloadSchema,
  GetImportBatchReceipt: GetImportBatchReceiptPayloadSchema,
};
