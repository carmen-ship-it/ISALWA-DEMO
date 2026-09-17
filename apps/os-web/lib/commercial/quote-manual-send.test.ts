import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import {
  canRecordQuoteManualSend,
  QUOTE_MANUAL_SEND_COPY,
  quoteManualSendHistoryLabel,
} from '@/lib/commercial/quote-manual-send';

const root = process.cwd();

describe('quote manual send record', () => {
  it('is only offered for submitted quotes', () => {
    assert.equal(canRecordQuoteManualSend('submitted'), true);
    for (const status of ['draft', 'accepted', 'cancelled']) {
      assert.equal(canRecordQuoteManualSend(status), false, status);
    }
  });

  it('states clearly that ISALWA does not send WhatsApp yet', () => {
    assert.match(
      QUOTE_MANUAL_SEND_COPY.disclaimer,
      /ISALWA registra el envío; no envía el mensaje desde aquí todavía/,
    );
    assert.equal(QUOTE_MANUAL_SEND_COPY.action, 'Registrar como enviada');
    assert.equal(QUOTE_MANUAL_SEND_COPY.successToast, 'Envío registrado.');
    assert.equal(
      quoteManualSendHistoryLabel('whatsapp'),
      'Cotización registrada como enviada por WhatsApp',
    );
    assert.equal(
      quoteManualSendHistoryLabel('email'),
      'Cotización registrada como enviada por Email',
    );
  });

  it('wires command + envío modal + follow-up prompt without inventing provider send', () => {
    const form = readFileSync(
      resolve(root, 'components/commercial/quote-envio-section.tsx'),
      'utf8',
    );
    const page = readFileSync(
      resolve(root, 'app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
      'utf8',
    );
    const actions = readFileSync(resolve(root, 'lib/commercial/actions.ts'), 'utf8');
    const convert = readFileSync(
      resolve(root, 'components/commercial/convert-quote-form.tsx'),
      'utf8',
    );
    assert.match(form, /recordQuoteManualSendAction/);
    assert.match(form, /QUOTE_MANUAL_SEND_COPY\.followUpPrompt/);
    assert.match(form, /channel.*whatsapp|value="whatsapp"/);
    assert.match(form, /value="email"/);
    assert.match(form, /showModal|dialog/);
    assert.doesNotMatch(form, /WhatsAppProvider|sendMessage|twilio|meta\.graph/i);
    assert.match(page, /QuoteEnvioSection/);
    assert.match(actions, /RecordQuoteManualSend/);
    assert.match(convert, /Cliente aceptó · Convertir a Pedido/);
    assert.match(convert, /showModal|dialog/);
  });

  it('keeps PDF download on the quote detail path', () => {
    const page = readFileSync(
      resolve(root, 'app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
      'utf8',
    );
    const pdf = readFileSync(
      resolve(root, 'components/commercial/quote-pdf-download-button.tsx'),
      'utf8',
    );
    assert.match(page, /QuotePdfDownloadButton|QuoteDetailActions|QuoteDocumentoCard/);
    assert.match(pdf, /\/api\/quotes\//);
    assert.match(pdf, /QUOTE_PDF_COPY\.download|Descargar PDF/);
  });

  it('keeps convert sticky copy honest about submitted status', () => {
    const page = readFileSync(
      resolve(root, 'app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
      'utf8',
    );
    assert.match(page, /Cliente aceptó · listo para pedido/);
    assert.match(page, /estado sigue presentada hasta convertir/);
    assert.match(page, /createOrderAction|ConvertQuoteForm/);
  });
});
