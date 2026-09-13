import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ListOpportunitiesQuerySchema,
  ListOrdersQuerySchema,
  ListQuotesQuerySchema,
} from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { buildQueryContext, type CommercialQueryService } from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { OS_COMMERCIAL_QUERY_SERVICE, OS_STORE } from './os-store.module';

function toHttp(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  const status =
    code === 'AUTH_REQUIRED'
      ? HttpStatus.UNAUTHORIZED
      : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED' || code === 'ACCESS_REVOKED'
        ? HttpStatus.FORBIDDEN
        : code === 'NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : code === 'VALIDATION_FAILED'
            ? HttpStatus.BAD_REQUEST
            : HttpStatus.INTERNAL_SERVER_ERROR;
  return new HttpException({ code }, status);
}

@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMERCIAL_QUERY_SERVICE) private readonly commercialQuery: CommercialQueryService,
  ) {}

  @Get()
  async list(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListOpportunitiesQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.commercialQuery.listOpportunities(ctx, parsed.data);
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get(':opportunityId')
  async get(@Param('opportunityId') opportunityId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.commercialQuery.getOpportunity(ctx, opportunityId);
    } catch (err) {
      throw toHttp(err);
    }
  }
}

@Controller('quotes')
export class QuotesController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMERCIAL_QUERY_SERVICE) private readonly commercialQuery: CommercialQueryService,
  ) {}

  @Get()
  async list(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListQuotesQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.commercialQuery.listQuotes(ctx, parsed.data);
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get(':quoteId')
  async get(@Param('quoteId') quoteId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.commercialQuery.getQuote(ctx, quoteId);
    } catch (err) {
      throw toHttp(err);
    }
  }
}

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMERCIAL_QUERY_SERVICE) private readonly commercialQuery: CommercialQueryService,
  ) {}

  @Get()
  async list(@Query() queryParams: Record<string, string>, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const parsed = ListOrdersQuerySchema.safeParse(queryParams);
      if (!parsed.success) {
        throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
      }
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.commercialQuery.listOrders(ctx, parsed.data);
    } catch (err) {
      throw toHttp(err);
    }
  }

  @Get(':orderId')
  async get(@Param('orderId') orderId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const ctx = await buildQueryContext(session, this.workforceStore);
      return await this.commercialQuery.getOrder(ctx, orderId);
    } catch (err) {
      throw toHttp(err);
    }
  }
}
