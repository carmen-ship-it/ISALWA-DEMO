import { CapabilityLockedState } from '@/components/states/app-states';
import { PageContainer } from '@isalwa/ui';
import { CAPABILITY_PRESENTATION } from '@/lib/capabilities/presentation';
import { resolveNavItemFromCapabilities } from '@/lib/capabilities/resolve-nav';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';

export default async function FinanzasPage() {
  const auth = await getServerOsAuthContext();
  const presentation = CAPABILITY_PRESENTATION.finance;
  let message = presentation.employeeMessage;

  if (auth) {
    try {
      const client = createOsApiClient(auth);
      const { capabilities } = await client.getCapabilityState();
      const resolved = resolveNavItemFromCapabilities('/finanzas', capabilities);
      if (resolved.message) message = resolved.message;
    } catch {
      // keep default presentation message
    }
  }

  return (
    <PageContainer label="Finanzas" className="flex min-h-[50vh] items-center justify-center">
      <CapabilityLockedState message={message} />
    </PageContainer>
  );
}
