'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ContextDrawer } from '@isalwa/ui';
import { hrefWithoutPanel, type ListQueryState } from '@/lib/lists/url-state';

type QuickViewHostProps = {
  open: boolean;
  title: string;
  listPath: string;
  listQuery: ListQueryState;
  children: ReactNode;
};

export function QuickViewHost({ open, title, listPath, listQuery, children }: QuickViewHostProps) {
  const router = useRouter();
  const onClose = useCallback(() => {
    router.replace(hrefWithoutPanel(listPath, listQuery), { scroll: false });
  }, [listPath, listQuery, router]);

  return (
    <ContextDrawer open={open} title={title} onClose={onClose}>
      {children}
    </ContextDrawer>
  );
}
