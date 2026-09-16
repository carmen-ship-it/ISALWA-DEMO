import { canUseQaAccess } from '@isalwa/os-contracts';
import { isQaControlEnabled } from '@/lib/qa/runtime';

export function qaControlSurfaceAllowed(grantedScopes: readonly string[]): boolean {
  if (!isQaControlEnabled()) return false;
  return canUseQaAccess(grantedScopes);
}
