'use client';

import { Button } from '@isalwa/ui';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';

/** Vista de evaluación / owner — opens Story Mode without overwriting current client. */
export function VerEjemploCompletoButton() {
  const { canUseOwnerDemo, openStory } = useOwnerDemo();
  if (!canUseOwnerDemo) return null;

  return (
    <Button type="button" variant="secondary" size="sm" onClick={openStory}>
      <span data-shell-tour-full>Ver recorrido completo</span>
      <span data-shell-tour-compact>Recorrido</span>
    </Button>
  );
}
