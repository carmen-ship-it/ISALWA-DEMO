/** Client import BusinessEvent types. */
export const OS_IMPORT_EVENT_TYPES = [
  'import.batch.dry_run',
  'import.batch.validated',
  'import.batch.executed',
  'import.batch.rolled_back',
] as const;

export type OsImportEventType = (typeof OS_IMPORT_EVENT_TYPES)[number];

export function isOsImportEventType(value: string): value is OsImportEventType {
  return (OS_IMPORT_EVENT_TYPES as readonly string[]).includes(value);
}
