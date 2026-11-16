'use client';

import { useEffect, useRef } from 'react';

export type PreservedFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: [string, string][];
} | null;

const SKIPPED_TYPES = new Set(['hidden', 'file', 'submit', 'button', 'reset']);

export function submittedValues(formData: FormData): [string, string][] {
  return [...formData.entries()].flatMap(([name, value]) => (typeof value === 'string' ? [[name, value] as [string, string]] : []));
}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function namedFields(form: HTMLFormElement): Field[] {
  return [...form.elements].filter(
    (el): el is Field =>
      (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) &&
      Boolean(el.name) &&
      !SKIPPED_TYPES.has(el.type),
  );
}

/** Puts the submitted values back after React resets an uncontrolled form. */
export function restoreFormValues(form: HTMLFormElement, values: [string, string][]): void {
  const byName = new Map<string, string[]>();
  for (const [name, value] of values) byName.set(name, [...(byName.get(name) ?? []), value]);
  const used = new Map<string, number>();
  for (const field of namedFields(form)) {
    const submitted = byName.get(field.name) ?? [];
    if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
      field.checked = submitted.includes(field.value);
      continue;
    }
    const index = used.get(field.name) ?? 0;
    used.set(field.name, index + 1);
    if (submitted[index] !== undefined) field.value = submitted[index];
  }
}

/** Marks and focuses the first field the server or the builder named; otherwise the first field the browser finds invalid. */
export function focusFirstInvalid(form: HTMLFormElement, fieldErrors?: Record<string, string>): void {
  const fields = namedFields(form);
  for (const field of fields) field.removeAttribute('aria-invalid');
  const named = fieldErrors ? fields.filter((field) => field.name in fieldErrors) : [];
  for (const field of named) field.setAttribute('aria-invalid', 'true');
  const target = named[0] ?? fields.find((field) => !field.checkValidity());
  target?.focus();
}

/**
 * Keeps what the person typed when a save fails and focuses the field to fix.
 * The action must return `values: submittedValues(formData)` with its error.
 */
export function usePreservedForm(state: PreservedFormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = ref.current;
    if (!form || !state?.error) return;
    if (state.values) restoreFormValues(form, state.values);
    focusFirstInvalid(form, state.fieldErrors);
  }, [state]);
  return ref;
}
