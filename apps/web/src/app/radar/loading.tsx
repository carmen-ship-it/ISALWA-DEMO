import { AppShell } from '@/components/app-shell';
import { RadarListSkeleton } from '@/components/experience-skeletons';

export default function RadarLoading() {
  return (
    <AppShell active="/radar">
      <RadarListSkeleton />
    </AppShell>
  );
}
