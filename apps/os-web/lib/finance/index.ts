export {
  authorizeFinanceOperationalWrite,
  financeOperationalRecordScope,
  financePermissionCopy,
  resolveFinancePageAccess,
  type FinanceActorSession,
  type FinanceDeskDenial,
  type FinancePageAccess,
} from './desk';
export { FINANCE_DESK_COPY, FINANCE_FORBIDDEN_COPY } from './copy';
/** Server-only loaders (cookies / next/headers) — import from `./load-subject-options` in RSC pages, not this barrel. */
