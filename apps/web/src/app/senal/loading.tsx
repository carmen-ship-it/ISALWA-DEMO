import { AppShell } from '@/components/app-shell';
import { SenalSkeleton } from '@/components/experience-skeletons';

export default function SenalLoading() {
  return (
    <AppShell active="/senal">
      <SenalSkeleton />
    </AppShell>
  );
}
