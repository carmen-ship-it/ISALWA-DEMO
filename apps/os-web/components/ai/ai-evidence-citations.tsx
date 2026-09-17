import type { AiAssistEvidenceRef } from '@/lib/ai/types';

const REF_LABELS: Record<AiAssistEvidenceRef['type'], string> = {
  issue: 'Incidencia',
  journal_entry: 'Bitácora',
  commitment: 'Compromiso',
};

export type AiEvidenceCitationsProps = {
  refs: readonly AiAssistEvidenceRef[];
  citationsLive: boolean;
};

export function AiEvidenceCitations({ refs, citationsLive }: AiEvidenceCitationsProps) {
  if (refs.length === 0) {
    return (
      <p className="text-xs text-[var(--isalwa-slate)]">
        {citationsLive
          ? 'Sin referencias de evidencia en la respuesta.'
          : 'Modo piloto: referencias disponibles cuando el proveedor esté activo.'}
      </p>
    );
  }

  return (
    <div>
      <h3 className="isalwa-section-label">
        {citationsLive ? 'Referencias citadas' : 'Referencias de evidencia'}
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-[var(--isalwa-slate)]">
        {refs.map((ref) => (
          <li key={`${ref.type}:${ref.id}`}>
            <span className="font-medium text-[var(--isalwa-kiln)]">{REF_LABELS[ref.type]}</span>
            {' · '}
            <span className="font-mono text-xs">{ref.id}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
