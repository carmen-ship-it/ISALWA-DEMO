import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommerceService } from './commerce.service';

@Controller()
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('products')
  products(@Query('q') q?: string) {
    return this.commerce.listProducts(q);
  }

  @Get('accounts/:accountId/products/:productId/last-price')
  lastPrice(@Param('accountId') accountId: string, @Param('productId') productId: string) {
    return this.commerce.lastPrice(accountId, productId);
  }

  @Get('quotes')
  listQuotes(@Query('accountId') accountId?: string) {
    return this.commerce.listQuotes(accountId);
  }

  @Get('quotes/:id')
  getQuote(@Param('id') id: string) {
    return this.commerce.getQuote(id);
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
  getInvoice(@Param('id') id: string) {
    return this.commerce.getInvoice(id);
  }

  @Post('invoices/:id/payments')
  pay(
    @Param('id') id: string,
    @Body() body: { amountCentavos: number; method?: string; reference?: string },
  ) {
    return this.commerce.recordPayment({ invoiceId: id, ...body });
  }
}
