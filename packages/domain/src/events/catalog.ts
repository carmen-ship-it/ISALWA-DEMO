import type { CommercialEventCatalogEntry, CommercialEventType } from './types';
import { COMMERCIAL_EVENT_TYPES } from './types';

export const COMMERCIAL_EVENT_CATALOG: Record<CommercialEventType, CommercialEventCatalogEntry> =
  {
    'account.created': {
      type: 'account.created',
      defaultTitle: 'Cliente creado',
      chapter: 'relación',
      consumers: ['personas', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'visit.scheduled': {
      type: 'visit.scheduled',
      defaultTitle: 'Visita programada',
      chapter: 'campo',
      consumers: ['personas', 'radar', 'notifications', 'memoria'],
      mutability: 'immutable',
    },
    'visit.completed': {
      type: 'visit.completed',
      defaultTitle: 'Visita completada',
      chapter: 'campo',
      consumers: ['personas', 'pulso', 'radar', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'quote.created': {
      type: 'quote.created',
      defaultTitle: 'Cotización creada',
      chapter: 'comercio',
      consumers: ['personas', 'revenue', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'quote.revised': {
      type: 'quote.revised',
      defaultTitle: 'Cotización revisada',
      chapter: 'comercio',
      consumers: ['personas', 'revenue', 'memoria'],
      mutability: 'immutable',
    },
    'quote.sent': {
      type: 'quote.sent',
      defaultTitle: 'Cotización enviada',
      chapter: 'comercio',
      consumers: ['personas', 'senal', 'notifications', 'memoria'],
      mutability: 'immutable',
    },
    'quote.accepted': {
      type: 'quote.accepted',
      defaultTitle: 'Cotización aceptada',
      chapter: 'comercio',
      consumers: ['personas', 'pulso', 'revenue', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'order.confirmed': {
      type: 'order.confirmed',
      defaultTitle: 'Pedido confirmado',
      chapter: 'comercio',
      consumers: ['personas', 'revenue', 'memoria'],
      mutability: 'immutable',
    },
    'invoice.issued': {
      type: 'invoice.issued',
      defaultTitle: 'Factura emitida',
      chapter: 'comercio',
      consumers: ['personas', 'pulso', 'revenue', 'collections', 'memoria'],
      mutability: 'immutable',
    },
    'payment.allocated': {
      type: 'payment.allocated',
      defaultTitle: 'Pago asignado',
      chapter: 'cobranza',
      consumers: ['personas', 'pulso', 'collections', 'revenue', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'promise.made': {
      type: 'promise.made',
      defaultTitle: 'Promesa de pago',
      chapter: 'cobranza',
      consumers: ['personas', 'collections', 'radar', 'notifications', 'memoria'],
      mutability: 'immutable',
    },
    'promise.broken': {
      type: 'promise.broken',
      defaultTitle: 'Promesa incumplida',
      chapter: 'cobranza',
      consumers: ['personas', 'collections', 'radar', 'notifications', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'whatsapp.received': {
      type: 'whatsapp.received',
      defaultTitle: 'WhatsApp recibido',
      chapter: 'señal',
      consumers: ['senal', 'personas', 'radar', 'notifications', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'whatsapp.sent': {
      type: 'whatsapp.sent',
      defaultTitle: 'WhatsApp enviado',
      chapter: 'señal',
      consumers: ['senal', 'personas', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'task.completed': {
      type: 'task.completed',
      defaultTitle: 'Tarea completada',
      chapter: 'interno',
      consumers: ['personas', 'notifications', 'memoria'],
      mutability: 'immutable',
    },
    'note.created': {
      type: 'note.created',
      defaultTitle: 'Nota interna',
      chapter: 'interno',
      consumers: ['personas', 'memoria', 'ai'],
      mutability: 'immutable',
    },
    'credit.approved': {
      type: 'credit.approved',
      defaultTitle: 'Crédito aprobado',
      chapter: 'crédito',
      consumers: ['personas', 'collections', 'revenue', 'memoria'],
      mutability: 'immutable',
    },
    'territory.reassigned': {
      type: 'territory.reassigned',
      defaultTitle: 'Territorio reasignado',
      chapter: 'territorio',
      consumers: ['personas', 'radar', 'memoria', 'notifications'],
      mutability: 'immutable',
    },
  };

export function isCommercialEventType(value: string): value is CommercialEventType {
  return (COMMERCIAL_EVENT_TYPES as readonly string[]).includes(value);
}

export function catalogEntry(type: CommercialEventType): CommercialEventCatalogEntry {
  return COMMERCIAL_EVENT_CATALOG[type];
}
