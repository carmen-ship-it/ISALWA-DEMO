'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@isalwa/ui';
import { cx } from '@isalwa/ui';

type CommandSubmitButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
};

export function CommandSubmitButton({
  label,
  variant = 'primary',
  className,
  disabled = false,
}: CommandSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cx(className)}
    >
      {pending ? 'Guardando…' : label}
    </Button>
  );
}
