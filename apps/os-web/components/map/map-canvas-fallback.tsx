import { StatusPill } from '@isalwa/ui';
import type { MapProviderStatus } from '@/lib/map/provider-status';

type MapCanvasFallbackProps = {
  provider: MapProviderStatus;
  plottableCount: number;
  total: number;
};

/**
 * Geographic frame without tiles or invented pins.
 * Calm sky / kiln composition — intentional waiting room, not a broken map.
 */
export function MapCanvasFallback({ provider, plottableCount, total }: MapCanvasFallbackProps) {
  const coverageLine =
    plottableCount > 0 || total > 0
      ? `${plottableCount} de ${total} clientes con coordenadas confirmadas`
      : null;

  return (
    <div
      className="relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] shadow-[var(--isalwa-shadow-lift)] md:min-h-[440px]"
      role="img"
      aria-label="Lienzo de mapa en espera — sin proveedor conectado"
      data-map-canvas="waiting"
      data-map-provider-blocked=""
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            linear-gradient(180deg, color-mix(in srgb, #4a5d73 14%, var(--isalwa-porcelain)) 0%, color-mix(in srgb, var(--isalwa-porcelain) 92%, white) 42%, var(--isalwa-porcelain) 100%),
            radial-gradient(ellipse 90% 40% at 50% 0%, color-mix(in srgb, var(--isalwa-info) 18%, transparent), transparent 70%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--isalwa-mist) 1px, transparent 1px), linear-gradient(to bottom, var(--isalwa-mist) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <p className="isalwa-kicker">Santa Cruz · geografía comercial</p>
        <h2 className="mt-3 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)] md:text-3xl">
          Vista geográfica en preparación
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La información de ubicación ya está organizada. La visualización completa sobre mapa podrá activarse cuando se conecte el proveedor geográfico.
        </p>
        {coverageLine ? (
          <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--isalwa-slate)]">{coverageLine}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <StatusPill tone="manual">{provider.label}</StatusPill>
        </div>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-[var(--isalwa-slate)]">{provider.detail}</p>
        <p className="mt-4 max-w-md text-xs leading-relaxed text-[var(--isalwa-slate)]">
          Ubicación registrada — coordenadas pendientes: no se trazan en el lienzo hasta confirmar latitud y longitud.
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-white)_88%,var(--isalwa-porcelain))] px-3 py-2.5 text-[10px] text-[var(--isalwa-slate)] backdrop-blur-sm">
        <span>Territorio en espera · Sin calles · Sin calor · Sin pines inventados</span>
        <span>Proveedor geográfico no conectado</span>
      </div>
    </div>
  );
}
