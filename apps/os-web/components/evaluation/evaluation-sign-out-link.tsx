import Link from 'next/link';
import { Button } from '@isalwa/ui';

/** GET sign-out — keeps /evaluacion free of mutating server-action POSTs. */
export function EvaluationSignOutLink({
  label,
  variant = 'secondary',
}: {
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Link href="/auth/sign-out" className="inline-flex" prefetch={false}>
      <Button type="button" variant={variant}>
        {label}
      </Button>
    </Link>
  );
}
