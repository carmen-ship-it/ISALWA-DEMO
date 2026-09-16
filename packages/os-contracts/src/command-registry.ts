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
import {
  COMMITMENT_COMMAND_PAYLOAD_SCHEMAS,
  COMMITMENT_COMMAND_NAMES,
  type CommitmentCommandName,
} from './commitment-commands';
import {
  ISSUE_COMMAND_PAYLOAD_SCHEMAS,
  ISSUE_COMMAND_NAMES,
  type IssueCommandName,
} from './issue';
import {
  PRODUCT_FEEDBACK_COMMAND_PAYLOAD_SCHEMAS,
  PRODUCT_FEEDBACK_COMMAND_NAMES,
  type ProductFeedbackCommandName,
} from './product-feedback';
import {
  DELIVERY_COMMAND_PAYLOAD_SCHEMAS,
  DELIVERY_COMMAND_NAMES,
  type DeliveryCommandName,
} from './delivery';

export const OS_COMMAND_NAMES = [
  ...WORKFORCE_COMMAND_NAMES,
  ...PARTY_COMMAND_NAMES,
  ...LOCATION_COMMAND_NAMES,
  ...IMPORT_COMMAND_NAMES,
  ...WORK_COMMAND_NAMES,
  ...COMMERCIAL_COMMAND_NAMES,
  ...ISSUE_COMMAND_NAMES,
  ...PRODUCT_FEEDBACK_COMMAND_NAMES,
  ...COMMITMENT_COMMAND_NAMES,
  ...DELIVERY_COMMAND_NAMES,
] as const;

export type OsCommandName =
  | WorkforceCommandName
  | PartyCommandName
  | LocationCommandName
  | ImportCommandName
  | WorkCommandName
  | CommercialCommandName
  | IssueCommandName
  | ProductFeedbackCommandName
  | CommitmentCommandName
  | DeliveryCommandName;

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
  ...ISSUE_COMMAND_PAYLOAD_SCHEMAS,
  ...PRODUCT_FEEDBACK_COMMAND_PAYLOAD_SCHEMAS,
  ...COMMITMENT_COMMAND_PAYLOAD_SCHEMAS,
  ...DELIVERY_COMMAND_PAYLOAD_SCHEMAS,
};
