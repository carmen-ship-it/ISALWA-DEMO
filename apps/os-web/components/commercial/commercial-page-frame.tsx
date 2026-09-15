import type { ReactNode } from 'react';
import { PageContainer, cx } from '@isalwa/ui';
import {
  commercialPageCanvasClass,
  commercialPageInnerClass,
} from '@/components/commercial/commercial-surfaces';

type CommercialPageFrameProps = {
  label: string;
  children: ReactNode;
  className?: string;
  'data-tour'?: string;
};

/** Porcelain canvas + constrained inner measure for commercial desks. */
export function CommercialPageFrame({
  label,
  children,
  className,
  'data-tour': dataTour,
}: CommercialPageFrameProps) {
  return (
    <PageContainer label={label} className={cx(commercialPageCanvasClass, className)} data-tour={dataTour}>
      <div className={commercialPageInnerClass}>{children}</div>
    </PageContainer>
  );
}
