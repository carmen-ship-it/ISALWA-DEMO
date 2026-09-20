/**
 * Single page-level help — do not repeat on every Nota/Salida/Entrega card.
 */
export function EntregaPageDisclaimer({ className }: { className?: string }) {
  return (
    <details
      className={[
        'mb-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]',
        'bg-[color-mix(in_srgb,var(--isalwa-sky-200)_22%,white)] px-4 py-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-entrega-page-disclaimer=""
    >
      <summary className="cursor-pointer list-none text-sm font-medium text-[var(--isalwa-kiln)] [&::-webkit-details-marker]:hidden">
        ¿Qué significa nota, salida y entrega?
      </summary>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--isalwa-slate)]" role="note">
        La nota de entrega es un documento operativo; no es factura y no significa que el pedido
        llegó al cliente. La salida registra que la mercadería salió del almacén. La entrega
        registra la recepción (requiere salida y «Recibido por»).
      </p>
    </details>
  );
}
