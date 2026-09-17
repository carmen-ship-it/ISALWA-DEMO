import { resolveAiHostedVisibility } from './hosted-state';
import { AiAssistPanel, type AiAssistPanelProps } from './ai-assist-panel';

export type AiAssistShellProps = Omit<AiAssistPanelProps, 'aiEnabled' | 'citationsLive'>;

/**
 * Server wrapper: hides the entire assist block when AI is off or the provider gateway is blocked.
 */
export function AiAssistShell(props: AiAssistShellProps) {
  const hosted = resolveAiHostedVisibility();
  if (!hosted.show) {
    return null;
  }
  return <AiAssistPanel {...props} aiEnabled citationsLive={hosted.citationsLive} />;
}
