import { NextResponse } from 'next/server';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';

type RouteParams = {
  params: Promise<{ id: string }>;
};

function staffPdfError(status: 401 | 403 | 404 | 500) {
  const message =
    status === 401
      ? 'Su sesión venció. Vuelva a iniciar sesión para descargar la nota de entrega.'
      : status === 403
        ? 'No tiene permiso para descargar esta nota de entrega.'
        : status === 404
          ? 'No se encontró esta nota de entrega.'
          : 'No se pudo preparar la nota de entrega. Intente de nuevo.';
  return NextResponse.json({ message }, { status });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return staffPdfError(401);
  }

  const { id } = await params;
  const trimmed = id?.trim();
  if (!trimmed) {
    return staffPdfError(404);
  }

  try {
    const client = createOsApiClient(auth);
    const pdf = await client.getDeliveryNotePdf(trimmed);
    return new NextResponse(pdf.bytes, {
      status: 200,
      headers: {
        'Content-Type': pdf.contentType,
        'Content-Disposition': `attachment; filename="${pdf.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof OsApiError) {
      if (err.kind === 'unauthorized') return staffPdfError(401);
      if (err.kind === 'forbidden') return staffPdfError(403);
      if (err.kind === 'not_found') return staffPdfError(404);
    }
    return staffPdfError(500);
  }
}
