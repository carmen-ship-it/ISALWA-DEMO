/** Chrome for Modo guiado. No names, numbers, or search suggestions. */

export const GUIDE_CHROME = {
  kicker: 'Modo guiado',
  title: 'Recorrido del piloto',
  continue: 'Continuar',
  close: 'Cerrar',
  show: 'Mostrar recorrido',
  reset: 'Restablecer recorrido',
  replay: 'Repetir',
  ayuda: 'Repetir desde Ayuda',
  localNote: 'El avance queda en este navegador. No es un registro de la empresa.',
  routePill: 'En esta rama',
  wavePill: 'En esta ola',
  patternPill: 'Sin ejemplo',
  closeLabel: 'Cerrar recorrido',
} as const;

export function progressLabel(index: number, total: number): string {
  const safeTotal = Math.max(total, 1);
  const safeIndex = Math.min(Math.max(index, 0), safeTotal - 1);
  return `Paso ${safeIndex + 1} de ${safeTotal}`;
}

export function replayLabel(title: string): string {
  return `${GUIDE_CHROME.replay} ${title}`;
}
