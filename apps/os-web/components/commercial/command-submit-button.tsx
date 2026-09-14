'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@isalwa/ui';
import { cx } from '@isalwa/ui';

type CommandSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
};

export function CommandSubmitButton({
  label,
  pendingLabel = 'Guardando…',
  variant = 'primary',
  className,
  disabled = false,
}: CommandSubmitButtonProps) {
  const { pending } = useFormStatus();
  const locked = useRef(false);

  useEffect(() => {
    if (!pending) locked.current = false;
  }, [pending]);

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cx(className)}
      onClick={(event) => {
        if (locked.current || pending || disabled) {
          event.preventDefault();
          return;
        }
        locked.current = true;
      }}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
