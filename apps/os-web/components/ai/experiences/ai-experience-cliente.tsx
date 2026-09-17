import { AiAssistShell } from '../ai-assist-shell';

export type AiExperienceClienteProps = {
  partyId: string;
};

/** Cliente 360 summary — authorized party evidence only. */
export function AiExperienceCliente({ partyId }: AiExperienceClienteProps) {
  return (
    <AiAssistShell
      title="Ayuda con este cliente"
      feature="summarize_customer"
      subjectType="party"
      subjectId={partyId}
      surface="cliente360"
      promptLabel="Preguntar sobre este cliente"
    />
  );
}
