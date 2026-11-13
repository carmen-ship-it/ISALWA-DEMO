'use client';

import { Button } from '@isalwa/ui';
import { useJourney } from '@/components/journey/journey-provider';

/** Top Journey tab — opens the guided presentation over the current screen. */
export function VerEjemploCompletoButton() {
  const { canOpenJourney, openStory } = useJourney();
  if (!canOpenJourney) return null;

  return (
    <Button type="button" variant="secondary" size="sm" onClick={openStory}>
      <span data-shell-tour-full>Ver recorrido completo</span>
      <span data-shell-tour-compact>Recorrido</span>
    </Button>
  );
}
