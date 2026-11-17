import { NextResponse } from 'next/server';
import { endWebSession } from '@/lib/auth/actions';

/**
 * Dedicated sign-out endpoint so /evaluacion can stay GET/HEAD-only
 * (no server-action POST replay onto the evaluation surface).
 */
async function endSession(request: Request): Promise<NextResponse> {
  await endWebSession();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}

export async function GET(request: Request) {
  return endSession(request);
}

export async function POST(request: Request) {
  return endSession(request);
}
