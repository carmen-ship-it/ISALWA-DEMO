import { Injectable } from '@nestjs/common';
import type { TrustedTenantSession } from '../auth/trusted-session';
import { readPulse, type PulseReadDb, type PulseReadResult } from './pulse-query';

@Injectable()
export class PulseService {
  getPulse(
    session: TrustedTenantSession | null,
    db: PulseReadDb | null,
    asOf?: Date,
  ): Promise<PulseReadResult> {
    return readPulse({ session, db, asOf });
  }
}
