import { z } from 'zod';
import {
  WORKFORCE_COMMAND_PAYLOAD_SCHEMAS as WORKFORCE_PAYLOAD_SCHEMAS,
  WORKFORCE_COMMAND_NAMES,
  type WorkforceCommandName,
} from './commands';
import {
  PARTY_COMMAND_PAYLOAD_SCHEMAS,
  PARTY_COMMAND_NAMES,
  type PartyCommandName,
} from './party-commands';
import {
  WORK_COMMAND_PAYLOAD_SCHEMAS,
  WORK_COMMAND_NAMES,
  type WorkCommandName,
} from './work-commands';
import {
  COMMERCIAL_COMMAND_PAYLOAD_SCHEMAS,
  COMMERCIAL_COMMAND_NAMES,
  type CommercialCommandName,
} from './commercial-commands';
import {
  LOCATION_COMMAND_PAYLOAD_SCHEMAS,
  LOCATION_COMMAND_NAMES,
  type LocationCommandName,
} from './location-commands';
import {
  IMPORT_COMMAND_PAYLOAD_SCHEMAS,
  IMPORT_COMMAND_NAMES,
  type ImportCommandName,
} from './import-commands';

export const OS_COMMAND_NAMES = [
  ...WORKFORCE_COMMAND_NAMES,
  ...PARTY_COMMAND_NAMES,
  ...LOCATION_COMMAND_NAMES,
  ...IMPORT_COMMAND_NAMES,
  ...WORK_COMMAND_NAMES,
  ...COMMERCIAL_COMMAND_NAMES,
] as const;

export type OsCommandName =
  | WorkforceCommandName
  | PartyCommandName
  | LocationCommandName
  | ImportCommandName
  | WorkCommandName
  | CommercialCommandName;

export function isOsCommandName(value: string): value is OsCommandName {
  return (OS_COMMAND_NAMES as readonly string[]).includes(value);
}

export const COMMAND_PAYLOAD_SCHEMAS: Record<OsCommandName, z.ZodTypeAny> = {
  ...WORKFORCE_PAYLOAD_SCHEMAS,
  ...PARTY_COMMAND_PAYLOAD_SCHEMAS,
  ...LOCATION_COMMAND_PAYLOAD_SCHEMAS,
  ...IMPORT_COMMAND_PAYLOAD_SCHEMAS,
  ...WORK_COMMAND_PAYLOAD_SCHEMAS,
  ...COMMERCIAL_COMMAND_PAYLOAD_SCHEMAS,
};
