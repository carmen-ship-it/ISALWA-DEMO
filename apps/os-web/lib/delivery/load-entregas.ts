import { getServerOsAuthContext } from '@/lib/auth/actions';
import { resolveEntregaSurface, type EntregaSurfaceStatus } from '@/lib/delivery/surface';

export type EntregaPageModel = {
  status: EntregaSurfaceStatus;
};

/**
 * Mounted read surface. No delivery query API is owned here.
 * An empty list is honest. Rows are not invented. A missing session organization
 * is permission, not an empty official document.
 * CROSS_LANE: a tenant-scoped delivery read can replace the empty list later.
 * Do not assign a document number on that read.
 */
export async function loadEntregaPage(): Promise<EntregaPageModel> {
  let auth: Awaited<ReturnType<typeof getServerOsAuthContext>>;
  try {
    auth = await getServerOsAuthContext();
  } catch {
    return { status: 'error' };
  }
  if (!auth) return { status: 'permission' };

  const organizationId = auth.mode === 'dev' ? auth.session.organizationId : 'session';
  return {
    status: resolveEntregaSurface({
      organizationId,
      warehouseExitCount: 0,
      deliveryCount: 0,
    }),
  };
}
