import { catalogByKey } from "@/lib/reasoning";
import { libraryByKey } from "@/lib/consulting/questions";
import type { DiscoveryDimension, QuestionKind } from "@/types";

/**
 * Best-effort lookup of the canonical prompt/kind for a question key —
 * used only to LABEL an already-answered topic in the Guided Assessment
 * Review stage and to reconstruct a Question shape when re-opening a
 * topic for editing. Never generates new question content: it only reads
 * copy that already exists in the engine's own catalogs.
 */
export interface QuestionDisplayMeta {
  prompt: string;
  kind: QuestionKind;
  dimension?: DiscoveryDimension;
  placeholder?: string;
}

/**
 * The fixed identity/onboarding questions live inline in
 * domain/interview-engine.ts (they are not part of the adaptive catalog).
 * Only "business_overview" produces a scored knownFact worth relabeling —
 * mirrored here verbatim for display only, never resubmitted as new logic.
 */
const IDENTITY_QUESTION_META: Record<string, QuestionDisplayMeta> = {
  business_overview: {
    prompt: "Cuénteme sobre su negocio.",
    kind: "long_text",
    dimension: "operations",
    placeholder:
      "Qué hacen, a quién sirven, cómo se mueve el trabajo en la empresa…",
  },
};

export function lookupQuestionDisplay(key: string): QuestionDisplayMeta | null {
  const identity = IDENTITY_QUESTION_META[key];
  if (identity) return identity;

  const fromCatalog = catalogByKey(key);
  if (fromCatalog) {
    return {
      prompt: fromCatalog.prompt,
      kind: fromCatalog.kind,
      dimension: fromCatalog.dimension,
      placeholder: fromCatalog.placeholder,
    };
  }

  const fromLibrary = libraryByKey(key);
  if (fromLibrary) {
    return {
      prompt: fromLibrary.prompt,
      kind: fromLibrary.kind,
      dimension: fromLibrary.dimension,
      placeholder: fromLibrary.placeholder,
    };
  }

  return null;
}
