import {
  PRODUCTION_INTERNAL_TARGET_LABEL,
  type ProductionInternalTargetDate,
} from '@isalwa/os-contracts';

export type ProductionDateFact = {
  label: typeof PRODUCTION_INTERNAL_TARGET_LABEL;
  targetOn: string;
};

/**
 * The production date is shown only when the date contract already has one.
 * A customer date is never copied into this fact.
 */
export function productionInternalDateFact(
  productionDate: Pick<ProductionInternalTargetDate, 'targetOn' | 'source' | 'organizationId'> | null,
  sessionOrganizationId: string | null | undefined,
  customerCommittedOn?: string | null,
): ProductionDateFact | null {
  void customerCommittedOn;
  const organizationId = sessionOrganizationId?.trim() ?? '';
  if (!productionDate || !organizationId) return null;
  if (productionDate.organizationId !== organizationId) return null;
  if (productionDate.source !== 'production_internal') return null;
  const targetOn = productionDate.targetOn?.trim() ?? '';
  if (!targetOn) return null;
  return { label: PRODUCTION_INTERNAL_TARGET_LABEL, targetOn };
}
