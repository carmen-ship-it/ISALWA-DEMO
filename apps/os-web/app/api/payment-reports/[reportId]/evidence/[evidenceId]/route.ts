import { NextResponse } from 'next/server';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';

type RouteParams = {
  params: Promise<{ reportId: string; evidenceId: string }>;
};

function evidenceError(status: 401 | 403 | 404 | 500) {
  const message =
    status === 401
      ? 'Su sesión venció. Vuelva a iniciar sesión para ver el comprobante.'
      : status === 403
        ? 'No tiene permiso para ver este comprobante.'
        : status === 404
          ? 'No se encontró este comprobante.'
          : 'No se pudo abrir el comprobante. Intente de nuevo.';
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

/** Private payment evidence. Same boundary as the report: the API decides who may read it. */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getServerOsAuthContext();
  if (!auth) return evidenceError(401);
  const { reportId, evidenceId } = await params;
  if (!reportId?.trim() || !evidenceId?.trim()) return evidenceError(404);
  try {
    const file = await createOsApiClient(auth).getBinary(
      `/payment-reports/${encodeURIComponent(reportId.trim())}/evidence/${encodeURIComponent(evidenceId.trim())}`,
    );
    return new NextResponse(file.bytes, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.filename ?? 'comprobante'}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    if (err instanceof OsApiError) {
      if (err.kind === 'unauthorized') return evidenceError(401);
      if (err.kind === 'forbidden') return evidenceError(403);
      if (err.kind === 'not_found') return evidenceError(404);
    }
    return evidenceError(500);
  }
}
