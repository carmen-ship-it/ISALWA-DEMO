import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  sessionFromAuthenticatedRequest,
  type AuthenticatedTenantRequest,
} from '../auth/trusted-session';
import { CommerceService } from './commerce.service';

@Controller()
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('products')
  products(@Query('q') q?: string, @Req() req?: AuthenticatedTenantRequest) {
    return this.commerce.listProducts(q, sessionFromAuthenticatedRequest(req));
  }

  @Get('accounts/:accountId/products/:productId/last-price')
  lastPrice(
    @Param('accountId') accountId: string,
    @Param('productId') productId: string,
    @Req() req?: AuthenticatedTenantRequest,
  ) {
    return this.commerce.lastPrice(accountId, productId, sessionFromAuthenticatedRequest(req));
  }

  @Get('quotes')
  listQuotes(@Query('accountId') accountId?: string, @Req() req?: AuthenticatedTenantRequest) {
    return this.commerce.listQuotes(accountId, sessionFromAuthenticatedRequest(req));
  }

  @Get('quotes/:id')
  getQuote(@Param('id') id: string, @Req() req?: AuthenticatedTenantRequest) {
    return this.commerce.getQuote(id, sessionFromAuthenticatedRequest(req));
  }

  @Post('quotes')
  createQuote(
    @Body()
    body: {
      accountId: string;
      items: Array<{ productId: string; qty: number; unitPriceCentavos?: number }>;
      notes?: string;
    },
    @Req() req?: AuthenticatedTenantRequest,
  ) {
    return this.commerce.createQuote(
      { accountId: body.accountId, items: body.items, notes: body.notes },
      sessionFromAuthenticatedRequest(req),
    );
  }

  @Post('quotes/:id/send')
  sendQuote(@Param('id') id: string, @Req() req?: AuthenticatedTenantRequest) {
    return this.commerce.sendQuote(id, sessionFromAuthenticatedRequest(req));
  }

  @Post('quotes/:id/accept')
  acceptQuote(@Param('id') id: string, @Req() req?: AuthenticatedTenantRequest) {
    return this.commerce.acceptQuote(id, sessionFromAuthenticatedRequest(req));
  }

  @Get('invoices/:id')
  getInvoice(@Param('id') id: string, @Req() req?: AuthenticatedTenantRequest) {
    return this.commerce.getInvoice(id, sessionFromAuthenticatedRequest(req));
  }

  @Post('invoices/:id/payments')
  pay(
    @Param('id') id: string,
    @Body() body: { amountCentavos: number; method?: string; reference?: string },
    @Req() req?: AuthenticatedTenantRequest,
  ) {
    return this.commerce.recordPayment(
      {
        invoiceId: id,
        amountCentavos: body.amountCentavos,
        method: body.method,
        reference: body.reference,
      },
      sessionFromAuthenticatedRequest(req),
    );
  }
}
