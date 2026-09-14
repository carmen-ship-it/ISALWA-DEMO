/** Chrome for Modo guiado. No names, numbers, or claims that a capability is live. */

export const GUIDE_CHROME = {
  kicker: 'Modo guiado',
  title: 'Qué hacer ahora',
  nowQuestion: '¿Qué hago ahora?',
  continue: 'Continuar',
  close: 'Cerrar',
  show: 'Mostrar recorrido',
  reset: 'Restablecer recorrido',
  replay: 'Repetir',
  ayuda: 'Repetir desde Ayuda',
  localNote: 'El avance queda en este navegador. No es un registro de la empresa.',
  closeLabel: 'Cerrar recorrido',
  roleSales: 'Para ventas',
  roleFloor: 'Para operaciones',
  roleManagement: 'Para gerencia',
  roleFinance: 'Para finanzas',
} as const;

export function progressLabel(index: number, total: number): string {
  const safeTotal = Math.max(total, 1);
  const safeIndex = Math.min(Math.max(index, 0), safeTotal - 1);
  return `Paso ${safeIndex + 1} de ${safeTotal}`;
}

export function replayLabel(title: string): string {
  return `${GUIDE_CHROME.replay} ${title}`;
}
