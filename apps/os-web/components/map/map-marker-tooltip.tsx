'use client';

type MapMarkerTooltipProps = {
  name: string;
  x: number;
  y: number;
  visible: boolean;
};

export function MapMarkerTooltip({ name, x, y, visible }: MapMarkerTooltipProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[220px] -translate-x-1/2 -translate-y-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--isalwa-kiln)] shadow-[var(--isalwa-shadow-lift)]"
      style={{ left: x, top: y - 8 }}
      role="tooltip"
      data-map-hover-label={name}
    >
      {name}
    </div>
  );
}
