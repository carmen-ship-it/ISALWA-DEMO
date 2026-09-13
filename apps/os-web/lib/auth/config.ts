export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getOsApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_OS_API_URL?.trim();
  if (!base) {
    return 'http://localhost:4001/v1';
  }
  return base.replace(/\/$/, '');
}

export function getOsAuthMode(): 'supabase' | 'dev' {
  const mode = process.env.NEXT_PUBLIC_OS_AUTH_MODE?.trim();
  if (mode === 'supabase') return 'supabase';
  if (mode === 'dev') return 'dev';
  return isSupabaseConfigured() ? 'supabase' : 'dev';
}
