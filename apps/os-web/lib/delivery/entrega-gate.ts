/**
 * Entrega is a customer receipt. It is not a nota and not a salida.
 * A nota is never required. A recorded salida is.
 */

export const ENTREGA_GATE_COPY = {
  needsSalida:
    'Para registrar la entrega, primero registre la salida. La nota de entrega no reemplaza la salida.',
  needsReceivedBy: 'Para registrar la entrega, escriba quién recibió.',
} as const;

export type EntregaGate = 'needs-salida' | 'needs-received-by' | 'ready';

export function entregaGate(input: { hasSalida: boolean; receivedBy: string }): EntregaGate {
  if (!input.hasSalida) return 'needs-salida';
  if (!input.receivedBy.trim()) return 'needs-received-by';
  return 'ready';
}

export function entregaEnabled(input: { hasSalida: boolean; receivedBy: string }): boolean {
  return entregaGate(input) === 'ready';
}
