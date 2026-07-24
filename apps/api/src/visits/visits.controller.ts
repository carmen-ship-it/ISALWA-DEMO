import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { getPrisma } from '@isalwa/database';
import { createId } from '@isalwa/ts-utils';

@Controller('visits')
export class VisitsController {
  @Post('check-in')
  async checkIn(
    @Body()
    body: {
      accountId: string;
      result?: string;
      notes?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    const prisma = getPrisma();
    if (!prisma) throw new BadRequestException('Base de datos no disponible');
    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
      include: { locations: { where: { isPrimary: true }, take: 1 } },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');

    const now = new Date();
    const lat = body.lat ?? (account.locations[0] ? Number(account.locations[0].lat) : null);
    const lng = body.lng ?? (account.locations[0] ? Number(account.locations[0].lng) : null);
    const visitId = createId();
    const result = body.result ?? 'follow_up';

    await prisma.visit.create({
      data: {
        id: visitId,
        organizationId: account.organizationId,
        accountId: account.id,
        salesRepUserId: account.ownerUserId,
        status: 'completed',
        plannedAt: now,
        startedAt: now,
        completedAt: now,
        result,
        notes: body.notes ?? 'Check-in desde dossier ISALWA OS',
        checkinLat: lat,
        checkinLng: lng,
        withinGeofence: lat != null && lng != null,
      },
    });

    await prisma.account.update({
      where: { id: account.id },
      data: { lastVisitAt: now },
    });

    await prisma.activityEvent.create({
      data: {
        id: createId(),
        organizationId: account.organizationId,
        accountId: account.id,
        actorUserId: account.ownerUserId,
        type: 'visit_completed',
        title: 'Visita registrada',
        body: body.notes ?? `Resultado: ${result}`,
        payloadJson: { visitId, result },
        occurredAt: now,
      },
    });

    // Close open visit_gap attention for this account when possible
    await prisma.attentionItem.updateMany({
      where: { accountId: account.id, kind: 'visit_gap', status: 'open' },
      data: { status: 'resolved' },
    });

    return {
      id: visitId,
      accountId: account.id,
      status: 'completed',
      result,
      completedAt: now.toISOString(),
      href: `/personas/${account.id}`,
      nextHref: `/cierre?account=${account.id}`,
    };
  }
}
