import { NextResponse } from 'next/server';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';

type RouteParams = {
  params: Promise<{ instructionId: string }>;
};

function qrError(status: 401 | 404 | 500) {
  const message =
    status === 401
      ? 'Su sesión venció. Vuelva a iniciar sesión.'
      : status === 404
        ? 'No hay un QR aprobado con ese identificador.'
        : 'No se pudo abrir el QR. Intente de nuevo.';
  return NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

/** The approved QR image (published versions for members; drafts only for publishers, decided by the API). */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getServerOsAuthContext();
  if (!auth) return qrError(401);
  const { instructionId } = await params;
  if (!instructionId?.trim()) return qrError(404);
  try {
    const file = await createOsApiClient(auth).getBinary(`/payment-instructions/${encodeURIComponent(instructionId.trim())}/qr`);
    return new NextResponse(file.bytes, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    if (err instanceof OsApiError) {
      if (err.kind === 'unauthorized') return qrError(401);
      if (err.kind === 'not_found' || err.kind === 'forbidden') return qrError(404);
    }
    return qrError(500);
  }
}
