import type { ReactNode } from 'react';
import { ExperienceHeader } from '@isalwa/ui';

type PageHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ kicker, title, description, action }: PageHeaderProps) {
  return (
    <ExperienceHeader
      kicker={kicker ?? ''}
      title={title}
      subtitle={description}
      actions={action}
      className="mb-8"
    />
  );
}
