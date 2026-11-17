import type { Metadata } from 'next';
import { EVALUATION_WALKTHROUGH_TITLE } from '@/lib/evaluation/walkthrough-config';

export const metadata: Metadata = {
  title: EVALUATION_WALKTHROUGH_TITLE,
  description:
    'Evaluación guiada del sistema comercial ISALWA. No modifica datos ni envía mensajes.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function EvaluacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--isalwa-porcelain)]" data-evaluation-walkthrough-shell="">
      {children}
    </div>
  );
}
