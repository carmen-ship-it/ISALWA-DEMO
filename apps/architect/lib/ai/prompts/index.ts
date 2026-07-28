/**
 * Prompt registry — starters only.
 *
 * This is where named, versioned system/instruction prompts should live once
 * more than one AI call site needs the same wording. Nothing in Architect
 * should inline a prompt string that another route also needs — add it here
 * and import it instead.
 */

export const PROMPTS = {
  /** Vision transcription instruction — used by the document OCR route. */
  documentTranscription: [
    "Transcribe all readable text in this image exactly as it appears.",
    "Preserve line breaks, headings, table rows and labels.",
    "Do not summarize, translate, explain or add anything that is not written in the image.",
    "If the image contains no readable text, reply with an empty response.",
  ].join(" "),

  /** Default neutral summarization instruction — mirrors `ai.summarize()`'s built-in default. */
  summarizeNeutral:
    "Summarize the following text in clear, concise prose. Preserve key facts, numbers and names. Do not add information that is not present.",
} as const;

export type PromptKey = keyof typeof PROMPTS;
