import type { ListCap } from '@/lib/lists/list-cap';

export function ListCapNotice({ caps }: { caps: ListCap[] }) {
  if (caps.length === 0) return null;
  return (
    <div className="mt-4 space-y-2" data-list-cap-notice="visible">
      {caps.map((cap) => (
        <p key={cap.limit} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Mostrando los primeros {cap.limit} resultados. Use los filtros para acotar la vista.
        </p>
      ))}
    </div>
  );
}
