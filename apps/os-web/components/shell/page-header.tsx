import type { ReactNode } from 'react';
import { ExperienceHeader } from '@isalwa/ui';

type PageHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ kicker, title, description, action, className }: PageHeaderProps) {
  return (
    <ExperienceHeader
      kicker={kicker ?? ''}
      title={title}
      subtitle={description}
      actions={action}
      className={className ?? 'mb-5 md:mb-6'}
    />
  );
}
