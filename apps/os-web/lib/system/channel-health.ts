/**
 * Honest state of the messaging, email and AI integrations for the system page.
 *
 * Batch 9 rule: an environment variable naming a provider is a declaration, not a connection.
 * - WhatsApp: no WhatsApp adapter exists in the application (the registry only ever builds the
 *   mock messaging provider), so the state is "No conectado" whatever MESSAGING_PROVIDER says.
 * - Email: same; only the mock email provider is built.
 * - AI: a credential in the environment is "configurada", never "funcionando"; hosted live
 *   behavior is unproven until a human exercises it with authorization.
 *
 * Pure: reads only the environment object it is given. Calls no provider and prints no secret.
 */

type EnvLike = Readonly<Record<string, string | undefined>>;

export type ChannelHealthTone = 'success' | 'warning' | 'neutral';

export type ChannelHealthRow = {
  id: 'whatsapp' | 'email' | 'ai';
  label: string;
  state: string;
  detail: string;
  tone: ChannelHealthTone;
};

function declared(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v !== '' && v !== 'mock';
}

export function whatsappChannelHealth(env: EnvLike): ChannelHealthRow {
  return {
    id: 'whatsapp',
    label: 'WhatsApp',
    state: 'No conectado',
    detail: declared(env.MESSAGING_PROVIDER)
      ? 'Se declaró un proveedor de mensajería, pero ISALWA no tiene un adaptador de WhatsApp activo ni autorización de activación. No envía ni recibe mensajes; use "Registrar atención".'
      : 'ISALWA no envía ni recibe mensajes por WhatsApp. La activación requiere credenciales del proveedor y autorización expresa; mientras tanto use "Registrar atención".',
    tone: 'neutral',
  };
}

export function emailChannelHealth(env: EnvLike): ChannelHealthRow {
  return {
    id: 'email',
    label: 'Email',
    state: 'No conectado',
    detail: declared(env.EMAIL_PROVIDER)
      ? 'Se declaró un proveedor de correo, pero ISALWA no tiene un adaptador de correo activo ni remitente autorizado. No envía correos.'
      : 'El correo transaccional no está conectado en este entorno.',
    tone: 'neutral',
  };
}

export type AiChannelInput = {
  show: boolean;
  citationsLive: boolean;
  blocker?: 'DISABLED' | 'PROVIDER_BLOCKED';
};

export function aiChannelHealth(visibility: AiChannelInput): ChannelHealthRow {
  if (!visibility.show) {
    const blocked = visibility.blocker === 'PROVIDER_BLOCKED';
    return {
      id: 'ai',
      label: 'IA',
      state: blocked ? 'Falta configurar' : 'Desactivada',
      detail: blocked
        ? 'Falta la credencial del proveedor de IA en este entorno. La asistencia sigue apagada.'
        : 'La asistencia de IA permanece apagada hasta habilitarla de forma explícita.',
      tone: blocked ? 'warning' : 'neutral',
    };
  }
  if (visibility.citationsLive) {
    return {
      id: 'ai',
      label: 'IA',
      state: 'Configurada, sin verificar',
      detail:
        'Hay credencial de un proveedor de IA y la asistencia está habilitada. Su funcionamiento en este entorno no está verificado. La IA solo resume o sugiere: una persona decide y confirma.',
      tone: 'neutral',
    };
  }
  return {
    id: 'ai',
    label: 'IA',
    state: 'Piloto (mock)',
    detail:
      'La asistencia de IA está en piloto sin llamada a un proveedor. Es un doble de prueba, no un modelo real.',
    tone: 'neutral',
  };
}
