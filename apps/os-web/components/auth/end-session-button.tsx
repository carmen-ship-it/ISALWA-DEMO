'use client';

import { useTransition } from 'react';
import { Button } from '@isalwa/ui';
import { signOutAction, type SignOutReason } from '@/lib/auth/actions';

export function EndSessionButton({
  reason,
  label,
  variant = 'primary',
}: {
  reason?: SignOutReason;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        startTransition(async () => {
          await signOutAction(reason);
        });
      }}
    >
      {pending ? 'Cerrando sesión…' : label}
    </Button>
  );
}
