import { StatusPill } from '@isalwa/ui';
import type { MapProviderStatus } from '@/lib/map/provider-status';

type MapCanvasFallbackProps = {
  provider: MapProviderStatus;
  plottableCount: number;
  total: number;
};

/**
 * Geographic frame without tiles or invented pins.
 * Mirrors the demo map panel silhouette while staying honest.
 */
export function MapCanvasFallback({ provider, plottableCount, total }: MapCanvasFallbackProps) {
  return (
    <div
      className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] shadow-[var(--isalwa-shadow-lift)] md:min-h-[420px]"
      role="img"
      aria-label="Lienzo de mapa no conectado"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--isalwa-mist) 1px, transparent 1px), linear-gradient(to bottom, var(--isalwa-mist) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
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
            ? 'Ningún cliente visible tiene coordenadas para colocar en el mapa. La lista a la derecha (o en Lista) muestra procedencia y fichas sin inventar pines.'
            : `${plottableCount} de ${total} clientes podrían mostrarse cuando el lienzo esté conectado. Hasta entonces, use la lista — sin pines inventados.`}
        </p>
        <div className="mt-5">
          <StatusPill tone="info">{provider.label}</StatusPill>
        </div>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-[var(--isalwa-slate)]">
          {provider.detail}
        </p>
      </div>
      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)] bg-white/80 px-3 py-2 text-[10px] text-[var(--isalwa-slate)] backdrop-blur-sm">
        <span>Sin mapa de calor · Sin territorios inventados</span>
        <span className="font-[family-name:var(--isalwa-font-mono)]">
          {provider.engine ? `${provider.engine} · no conectado` : 'sin motor'}
        </span>
      </div>
    </div>
  );
}
