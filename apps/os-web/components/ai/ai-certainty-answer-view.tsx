import Link from 'next/link';
import type { AiCertaintyAnswer } from '@/lib/ai/types';

function BulletList({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Ninguno en el alcance autorizado.</p>;
  }
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--isalwa-slate)]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export type AiCertaintyAnswerViewProps = {
  certainty: AiCertaintyAnswer;
};

/** Renders CT3 §60 Ask ISALWA certainty format with deep-linked FUENTES. */
export function AiCertaintyAnswerView({ certainty }: AiCertaintyAnswerViewProps) {
  return (
    <div className="space-y-4" aria-label="Respuesta con certeza">
      <div>
        <h3 className="isalwa-section-label">LO CONFIRMADO</h3>
        <BulletList items={certainty.loConfirmado} />
      </div>
      <div>
        <h3 className="isalwa-section-label">PENDIENTE DE CONFIRMAR</h3>
        <BulletList items={certainty.pendienteDeConfirmar} />
      </div>
      <div>
        <h3 className="isalwa-section-label">NO REGISTRADO</h3>
        <BulletList items={certainty.noRegistrado} />
      </div>
      <div>
        <h3 className="isalwa-section-label">RECOMENDACIÓN</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
          {certainty.recomendacion}
        </p>
      </div>
      <div>
        <h3 className="isalwa-section-label">A QUIÉN PREGUNTAR</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
          {certainty.aQuienPreguntar}
        </p>
      </div>
      <div>
        <h3 className="isalwa-section-label">FUENTES</h3>
        {certainty.fuentes.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Sin enlaces de evidencia.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-[var(--isalwa-slate)]">
            {certainty.fuentes.map((fuente) => (
              <li key={`${fuente.type}:${fuente.id}:${fuente.href}`}>
                <Link
                  href={fuente.href}
                  className="font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                >
                  {fuente.label}
                </Link>
                {' · '}
                <span className="font-mono text-xs">{fuente.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
