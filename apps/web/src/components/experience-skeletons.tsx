import { Skeleton } from '@isalwa/ui';

/** Layout-matched skeletons for route loading.tsx — no spinners. */

export function RadarListSkeleton() {
  return (
    <div className="isalwa-page" aria-busy="true" aria-label="Cargando Radar">
      <Skeleton h={12} className="mb-3 w-24" />
      <Skeleton h={36} className="mb-3 w-[min(420px,90%)]" />
      <Skeleton h={14} className="mb-8 w-[min(360px,80%)]" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6"
          >
            <Skeleton h={4} className="mb-4 w-full" rounded="pill" />
            <Skeleton h={18} className="mb-2 w-2/3" />
            <Skeleton h={12} className="w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonasListSkeleton() {
  return (
    <div className="isalwa-page" aria-busy="true" aria-label="Cargando Personas">
      <Skeleton h={12} className="mb-3 w-28" />
      <Skeleton h={36} className="mb-8 w-[min(280px,70%)]" />
      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-5 md:p-6"
          >
            <Skeleton h={18} className="mb-4 w-3/4" />
            <Skeleton h={12} className="mb-2 w-full" />
            <Skeleton h={12} className="mb-2 w-5/6" />
            <Skeleton h={12} className="w-2/3" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} h={40} className="mb-2 w-full last:mb-0" />
        ))}
      </div>
    </div>
  );
}

export function SenalSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col px-4 pt-6 md:h-screen md:px-8 md:pt-8" aria-busy>
      <Skeleton h={12} className="mb-3 w-20" />
      <Skeleton h={32} className="mb-6 w-[min(480px,90%)]" />
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="hidden w-[340px] shrink-0 flex-col gap-2 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-3 md:flex">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} h={56} className="w-full" />
          ))}
        </div>
        <div className="min-w-0 flex-1 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4">
          <Skeleton h={16} className="mb-4 w-1/3" />
          <Skeleton h={48} className="mb-3 w-3/4" />
          <Skeleton h={48} className="mb-3 ml-auto w-2/3" />
          <Skeleton h={48} className="w-1/2" />
        </div>
      </div>
    </div>
  );
}
