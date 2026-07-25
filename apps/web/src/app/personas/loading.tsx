import { AppShell } from '@/components/app-shell';
import { PersonasListSkeleton } from '@/components/experience-skeletons';

export default function PersonasLoading() {
  return (
    <AppShell active="/personas">
      <PersonasListSkeleton />
    </AppShell>
  );
}
