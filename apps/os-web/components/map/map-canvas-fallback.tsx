import { StatusPill } from '@isalwa/ui';
import type { MapProviderStatus } from '@/lib/map/provider-status';

type MapCanvasFallbackProps = {
  provider: MapProviderStatus;
  plottableCount: number;
  total: number;
};

/**
 * Geographic frame without tiles or invented pins.
 * Soft territory silhouette — intentional waiting room, not a broken map.
 */
export function MapCanvasFallback({ provider, plottableCount, total }: MapCanvasFallbackProps) {
  return (
    <div
      className="relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] shadow-[var(--isalwa-shadow-lift)] md:min-h-[440px]"
      role="img"
      aria-label="Lienzo de mapa en espera — sin proveedor conectado"
      data-map-canvas="waiting"
    >
      {/* Soft territory wash — no streets, heat, or pins */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 42% 48%, color-mix(in srgb, var(--isalwa-glaze) 10%, transparent), transparent 70%),
            radial-gradient(ellipse 45% 40% at 68% 58%, color-mix(in srgb, var(--isalwa-info) 12%, transparent), transparent 65%),
            linear-gradient(165deg, color-mix(in srgb, var(--isalwa-porcelain) 80%, white), var(--isalwa-porcelain))
          `,
        }}
      />
      <div
        className="pointer-events-none absolute left-[12%] top-[18%] h-[64%] w-[76%] rounded-[46%_54%_48%_52%/52%_46%_54%_48%] border border-[color-mix(in_srgb,var(--isalwa-glaze)_18%,transparent)] opacity-70"
        aria-hidden
        style={{
          boxShadow: 'inset 0 0 60px color-mix(in srgb, var(--isalwa-glaze) 6%, transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--isalwa-mist) 1px, transparent 1px), linear-gradient(to bottom, var(--isalwa-mist) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <p className="isalwa-kicker">Santa Cruz · geografía comercial</p>
        <h2 className="mt-3 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)] md:text-3xl">
          El dinero tiene geografía
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {plottableCount === 0
            ? 'Ningún cliente visible tiene coordenadas para colocar. La lista (Mapa / Lista en móvil) muestra procedencia y fichas — sin inventar pines ni calles.'
            : `${plottableCount} de ${total} clientes ya tienen coordenadas listas. El lienzo de teselas espera una decisión de proveedor; hasta entonces la lista es la verdad operativa.`}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <StatusPill tone="manual">{provider.label}</StatusPill>
          {plottableCount > 0 ? (
            <StatusPill tone="info">{`${plottableCount} listos para el lienzo`}</StatusPill>
          ) : null}
        </div>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-[var(--isalwa-slate)]">
          {provider.detail}
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-white)_88%,var(--isalwa-porcelain))] px-3 py-2.5 text-[10px] text-[var(--isalwa-slate)] backdrop-blur-sm">
        <span>Territorio en espera · Sin calles · Sin calor · Sin pines inventados</span>
        <span className="font-[family-name:var(--isalwa-font-mono)]">
          {provider.engine ? `${provider.engine} · no conectado` : 'sin motor · decisión pendiente'}
        </span>
      </div>
    </div>
  );
}
