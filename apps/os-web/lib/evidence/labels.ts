import type { ConfirmationState, EvidenceSourceType, ExtractionConfidence } from '@isalwa/os-contracts';

/** Employee language. Never an internal enum name. */
export function sourceLabel(sourceType: EvidenceSourceType): string {
  switch (sourceType) {
    case 'customer_message':
      return 'Dicho por el cliente';
    case 'employee_entered':
      return 'Reportado por empleado';
    case 'ai_inferred':
      return 'Sugerido por IA';
    case 'isalwa_confirmed':
      return 'Confirmado en ISALWA';
    case 'external_system':
      return 'Confirmado por sistema conectado';
  }
}

export function confirmationLabel(state: ConfirmationState): string {
  switch (state) {
    case 'unconfirmed':
      return 'No confirmado';
    case 'reviewed':
      return 'Revisado';
    case 'confirmed':
      return 'Confirmado';
    case 'dismissed':
      return 'Descartado';
  }
}

export function confidenceLabel(confidence: ExtractionConfidence): string {
  switch (confidence) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
  }
}

export function confidenceExplainsUnderstandingOnly(): string {
  return 'La confianza dice si entendimos el mensaje. No dice si la empresa lo acepta.';
}
