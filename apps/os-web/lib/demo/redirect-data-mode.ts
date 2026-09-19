import { cookies, headers } from 'next/headers';
import { DEMO_DATA_MODE_COOKIE } from '@/lib/demo/owner-demo-identity';
import { dataModeForRedirect, withExplicitDataMode } from '@/lib/demo/preserve-data-mode';

/**
 * Carry the submitting page's explicit data mode onto a post-create href.
 * Form field, then Referer, then the mode cookie. Never inferred from a record name.
 */
export async function redirectKeepingDataMode(href: string, formData?: FormData): Promise<string> {
  const headerList = await headers();
  const referer = headerList.get('referer');
  let refererDatos: string | null = null;
  if (referer) {
    try {
      refererDatos = new URL(referer).searchParams.get('datos');
    } catch {
      refererDatos = null;
    }
  }
  const jar = await cookies();
  const mode = dataModeForRedirect({
    formDatos: formData ? String(formData.get('datos') ?? '') : null,
    refererDatos,
    cookieDatos: jar.get(DEMO_DATA_MODE_COOKIE)?.value,
  });
  return withExplicitDataMode(href, mode);
}
