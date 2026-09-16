/**
 * Product feedback types for os-web.
 */

export type FeedbackCategory =
  | 'mismatch'       // Esto no coincide...
  | 'missing'        // Falta algo aquí
  | 'issue'          // Reportar problema con ISALWA
  | 'suggestion'     // General suggestion
  | 'other';

export const FEEDBACK_CATEGORIES: Array<{ id: FeedbackCategory; label: string; description: string }> = [
  {
    id: 'mismatch',
    label: 'Esto no coincide…',
    description: 'Los datos mostrados no coinciden con la realidad.',
  },
  {
    id: 'missing',
    label: 'Falta algo aquí',
    description: 'Hay información o una función que debería estar pero no aparece.',
  },
  {
    id: 'issue',
    label: 'Reportar problema con ISALWA',
    description: 'Algo no funciona como debería en el sistema.',
  },
];

export type ProductFeedbackContext = {
  category?: FeedbackCategory;
  productRef?: string;
  pageUrl?: string;
};
