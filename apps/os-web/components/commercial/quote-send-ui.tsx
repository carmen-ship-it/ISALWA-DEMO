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
import { QuoteDraftNextStep } from '@/components/commercial/quote-builder-ui';
import { useQuoteLive } from '@/components/commercial/quote-live-frame';
import type { CommercialNextStep } from '@/lib/commercial/next-step';

type QuoteSendUiValue = {
  /** Authoritative server flag or local success after Registrar como enviada. */
  sendRecorded: boolean;
  markSendRecorded: () => void;
};

const QuoteSendUiContext = createContext<QuoteSendUiValue | null>(null);

export function QuoteSendUiProvider({
  sendRecorded: sendRecordedFromServer,
  children,
}: {
  sendRecorded: boolean;
  children: ReactNode;
}) {
  const [localRecorded, setLocalRecorded] = useState(false);
  const markSendRecorded = useCallback(() => setLocalRecorded(true), []);
  const sendRecorded = sendRecordedFromServer || localRecorded;
  const value = useMemo(
    () => ({ sendRecorded, markSendRecorded }),
    [sendRecorded, markSendRecorded],
  );
  return <QuoteSendUiContext.Provider value={value}>{children}</QuoteSendUiContext.Provider>;
}

export function useQuoteSendUi(): QuoteSendUiValue | null {
  return useContext(QuoteSendUiContext);
}

type QuotePageNextStepProps = {
  serverStatus: string;
  lineCount: number;
  /** Server-computed step before send registration. */
  presentedStep: CommercialNextStep | null;
  /** Server-computed step after send registration. */
  sentStep: CommercialNextStep | null;
};

/**
 * Next action follows live quote status + send registration.
 * Prevents a stale draft "preséntela" band after Presentar updates live status.
 */
export function QuotePageNextStep({
  serverStatus,
  lineCount,
  presentedStep,
  sentStep,
}: QuotePageNextStepProps) {
  const live = useQuoteLive();
  const sendUi = useQuoteSendUi();
  const status = live?.quote.status ?? serverStatus;
  const lines = live?.quote.lines.length ?? lineCount;
  const sendRecorded = Boolean(sendUi?.sendRecorded);

  if (status === 'draft') {
    return <QuoteDraftNextStep lineCount={lines} />;
  }

  if (sendRecorded && sentStep) {
    return <RecordNextStep step={sentStep} />;
  }

  return <RecordNextStep step={presentedStep} />;
}
