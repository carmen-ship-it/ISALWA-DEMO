'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { RecordNextStep } from '@/components/commercial/record-next-step';
import type { CommercialNextStep } from '@/lib/commercial/next-step';

type QuoteBuilderUiValue = {
  draftOpen: boolean;
  setDraftOpen: (open: boolean) => void;
};

const QuoteBuilderUiContext = createContext<QuoteBuilderUiValue | null>(null);

export function QuoteBuilderUiProvider({ children }: { children: ReactNode }) {
  const [draftOpen, setDraftOpenState] = useState(false);
  const setDraftOpen = useCallback((open: boolean) => {
    setDraftOpenState(open);
  }, []);
  const value = useMemo(() => ({ draftOpen, setDraftOpen }), [draftOpen, setDraftOpen]);
  return <QuoteBuilderUiContext.Provider value={value}>{children}</QuoteBuilderUiContext.Provider>;
}

export function useQuoteBuilderUi(): QuoteBuilderUiValue | null {
  return useContext(QuoteBuilderUiContext);
}

/** Draft-only next action that reflects saved lines vs an open unsaved line editor. */
export function QuoteDraftNextStep({ lineCount }: { lineCount: number }) {
  const ui = useQuoteBuilderUi();
  const statement = ui?.draftOpen
    ? 'Complete cantidad, unidad y precio y guarde la línea.'
    : lineCount === 0
      ? 'Agregue productos a la cotización.'
      : 'Revise la cotización y preséntela.';
  const step: CommercialNextStep = {
    statement,
    href: null,
    hrefLabel: null,
    waiting: false,
  };
  return <RecordNextStep step={step} />;
}
