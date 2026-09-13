import { NextResponse } from 'next/server';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';

type RouteParams = {
  params: Promise<{ quoteId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { quoteId } = await params;
  const trimmed = quoteId?.trim();
  if (!trimmed) {
    return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  }

  const dispositionParam = new URL(request.url).searchParams.get('disposition');
  const inline = dispositionParam === 'inline';

  try {
    const client = createOsApiClient(auth);
    const pdf = await client.getQuotePdf(trimmed, { inline });
    return new NextResponse(pdf.bytes, {
      status: 200,
      headers: {
        'Content-Type': pdf.contentType,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${pdf.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof OsApiError) {
      const status =
        err.kind === 'unauthorized'
          ? 401
          : err.kind === 'forbidden'
            ? 403
            : err.kind === 'not_found'
              ? 404
              : 500;
      return NextResponse.json({ code: err.code ?? err.kind.toUpperCase() }, { status });
    }
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
