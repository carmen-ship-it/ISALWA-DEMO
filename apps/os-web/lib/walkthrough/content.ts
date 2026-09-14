import { registerChapter, registerWelcome } from '@/lib/walkthrough';
import { chapter as commercialChapter } from './chapters/commercial';
import { chapter as customerChapter } from './chapters/customer';
import { chapter as globalChapter, welcome } from './chapters/global';
import { chapter as knowledgeChapter } from './chapters/knowledge';
import { chapter as mapChapter } from './chapters/map-truth';
import { chapter as messagesChapter } from './chapters/whatsapp-ai';
import { chapter as workforceChapter } from './chapters/workforce';
import type { TourChapter, TourStep } from './types';

/**
 * Integration point. This file groups existing step objects into page chapters.
 * It does not rewrite title, body, stateLabel, or target.
 *
 * Canonical runtime ids are the page ids. map and messages files keep tourId
 * map / messages; the runner registers mapa and mensajes only.
 * knowledge.ts learningMode and replay stay unused here.
 *
 * There is no /pedidos page. The commercial orders step stays on Cliente 360,
 * where the order list already renders. nextRoute is cleared so that page
 * tour does not jump to /clientes.
 *
 * Cotizaciones teaching steps stay on /cotizaciones. Status is per row and
 * the PDF lives on a quote document; neither route may leave the list page.
 * Trabajo vencido stays on /trabajo. A query nextRoute remounts the page
 * and drops the card, so that nextRoute is cleared.
 */

type SourceStep = {
  stepId: string;
  title: string;
  body: string;
  stateLabel: TourStep['stateLabel'];
  target?: string;
  nextRoute?: string;
};

function byId(steps: readonly SourceStep[], stepId: string): SourceStep {
  const step = steps.find((item) => item.stepId === stepId);
  if (!step) throw new Error(`Missing walkthrough step ${stepId}`);
  return step;
}

function place(step: SourceStep, nextRoute?: string): TourStep {
  return {
    stepId: step.stepId,
    title: step.title,
    body: step.body,
    stateLabel: step.stateLabel,
    ...(step.target ? { target: step.target } : {}),
    ...(nextRoute ? { nextRoute } : {}),
  };
}

function pageChapter(chapterId: string, title: string, steps: readonly TourStep[]): TourChapter {
  return { chapterId, title, steps };
}

export function loadWalkthroughContent(): void {
  const customer = customerChapter.steps;
  const commercial = commercialChapter.steps;
  const workforce = workforceChapter.steps;
  const customer360 = byId(customer, 'customer-360');

  registerWelcome(welcome);
  registerChapter(pageChapter('global', globalChapter.title, globalChapter.steps.map((step) => place(step, step.nextRoute))));
  registerChapter(
    pageChapter('clientes', customerChapter.title, [
      place(byId(customer, 'customer-search')),
      place(byId(customer, 'customer-filters')),
      place(byId(customer, 'customer-row')),
      place(byId(customer, 'customer-quick-view')),
      place(byId(customer, 'customer-add')),
    ]),
  );
  registerChapter(
    pageChapter('cliente-360', customer360.title, [
      place(byId(customer, 'customer-location')),
      place(customer360),
      place(byId(customer, 'customer-next-action')),
      place(byId(customer, 'customer-later')),
      place(byId(commercial, 'orders')),
    ]),
  );
  registerChapter(
    pageChapter('oportunidades', commercialChapter.title, [
      place(byId(commercial, 'opportunities'), '/oportunidades'),
    ]),
  );
  registerChapter(
    pageChapter('cotizaciones', commercialChapter.title, [
      place(byId(commercial, 'quotes')),
      place(byId(commercial, 'quote-status')),
      place(byId(commercial, 'quote-pdf')),
    ]),
  );
  registerChapter(
    pageChapter('aprobaciones', commercialChapter.title, [
      place(byId(commercial, 'approval-consequence'), '/aprobaciones'),
    ]),
  );
  registerChapter(
    pageChapter('trabajo', workforceChapter.title, [
      place(byId(workforce, 'trabajo-mios'), '/trabajo'),
      place(byId(workforce, 'trabajo-equipo-empresa')),
      place(byId(workforce, 'trabajo-vencido')),
    ]),
  );
  registerChapter(
    pageChapter('equipo', workforceChapter.title, [
      place(byId(workforce, 'acceso-propio'), '/administracion/equipo'),
      place(byId(workforce, 'cargo-no-autoriza'), '/administracion/equipo'),
      place(byId(workforce, 'invitar-empleado'), '/administracion/equipo/invitar'),
      place(byId(workforce, 'invitacion-enviada'), '/administracion/equipo/invitar'),
      place(byId(workforce, 'estados-acceso'), '/administracion/equipo'),
    ]),
  );
  registerChapter(pageChapter('ayuda', knowledgeChapter.title, knowledgeChapter.steps.map((step) => place(step, step.nextRoute))));
  registerChapter(pageChapter('mapa', mapChapter.title, mapChapter.steps.map((step) => place(step, step.nextRoute))));
  registerChapter(pageChapter('mensajes', messagesChapter.title, messagesChapter.steps.map((step) => place(step, step.nextRoute))));
}
