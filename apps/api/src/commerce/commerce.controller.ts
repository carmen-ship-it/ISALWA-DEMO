import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { sessionFromAuthenticatedRequest } from '../search/search-query';
import { CommerceService, type CommerceDetailDb, type CommerceReadDb } from './commerce.service';

/**
 * Nest does not attach authenticatedSession. These handlers fail closed when
 * that session is missing. query/header organizationId is not read. HTTP stays
 * AUTH_BLOCKED until a trusted session is attached; that is not a pass of the
 * live route.
 */
export type CommerceHttpRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  headers?: Record<string, string | undefined>;
  readDb?: CommerceReadDb | CommerceDetailDb | null;
};

@Controller()
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('products')
  products(@Query('q') q?: string, @Req() req?: CommerceHttpRequest) {
    return this.commerce.listProducts(
      q,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? (req.readDb as CommerceReadDb | null) : undefined,
    );
  }

  @Get('accounts/:accountId/products/:productId/last-price')
  lastPrice(
    @Param('accountId') accountId: string,
    @Param('productId') productId: string,
    @Req() req?: CommerceHttpRequest,
  ) {
    return this.commerce.lastPrice(
      accountId,
      productId,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? (req.readDb as CommerceDetailDb | null) : undefined,
    );
  }

  @Get('quotes')
  listQuotes(@Query('accountId') accountId?: string, @Req() req?: CommerceHttpRequest) {
    return this.commerce.listQuotes(
      accountId,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? (req.readDb as CommerceReadDb | null) : undefined,
    );
  }

  @Get('quotes/:id')
  getQuote(@Param('id') id: string, @Req() req?: CommerceHttpRequest) {
    return this.commerce.getQuote(
      id,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? (req.readDb as CommerceDetailDb | null) : undefined,
    );
  }

  @Post('quotes')
  createQuote(
    @Body()
    body: {
      accountId: string;
      items: Array<{ productId: string; qty: number; unitPriceCentavos?: number }>;
      notes?: string;
    },
  ) {
    return this.commerce.createQuote(body);
  }

  @Post('quotes/:id/send')
  sendQuote(@Param('id') id: string) {
    return this.commerce.sendQuote(id);
  }

  @Post('quotes/:id/accept')
  acceptQuote(@Param('id') id: string) {
    return this.commerce.acceptQuote(id);
  }

  @Get('invoices/:id')
  getInvoice(@Param('id') id: string, @Req() req?: CommerceHttpRequest) {
    return this.commerce.getInvoice(
      id,
      sessionFromAuthenticatedRequest({ authenticatedSession: req?.authenticatedSession }),
      req && 'readDb' in req ? (req.readDb as CommerceDetailDb | null) : undefined,
    );
  }

  @Post('invoices/:id/payments')
  pay(
    @Param('id') id: string,
    @Body() body: { amountCentavos: number; method?: string; reference?: string },
  ) {
    return this.commerce.recordPayment({ invoiceId: id, ...body });
  }
}
