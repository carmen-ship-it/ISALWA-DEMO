'use client';

import { useState } from 'react';
import { Button, Panel, SectionHeader } from '@isalwa/ui';
import {
  ORDER_PREP_COPY,
  buildOrderPrepReviewWork,
  type OrderPrepDepartment,
} from '@/components/commercial/order-prep-work';

export type OrderPrepCardProps = {
  orderId: string;
  partyId: string;
  actorMemberId: string;
  orderLabel?: string | null;
  assignees?: Partial<Record<OrderPrepDepartment, string | null>>;
  onRequestReview?: (input: {
    department: OrderPrepDepartment;
    command: 'CreateWorkItem';
    payload: Record<string, unknown>;
  }) => void | Promise<void>;
  onAssignResponsible?: (department: OrderPrepDepartment) => void;
};

const DEPARTMENTS: OrderPrepDepartment[] = ['production', 'warehouse', 'purchasing'];

export function OrderPrepCard({
  orderId,
  partyId,
  actorMemberId,
  orderLabel,
  assignees,
  onRequestReview,
  onAssignResponsible,
}: OrderPrepCardProps) {
  const [pending, setPending] = useState<OrderPrepDepartment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleReview(department: OrderPrepDepartment) {
    const built = buildOrderPrepReviewWork({
      department,
      orderId,
      partyId,
      actorMemberId,
      assigneeMemberId: assignees?.[department] ?? null,
      orderLabel,
    });
    if (!built.ok) {
      setNotice('No se pudo preparar la solicitud de revisión.');
      return;
    }
    if (!onRequestReview) {
      setNotice('La solicitud de revisión no está conectada en esta vista.');
      return;
    }
    setPending(department);
    try {
      await onRequestReview({
        department,
        command: built.command,
        payload: built.payload,
      });
      setNotice(null);
    } finally {
      setPending(null);
    }
  }

  return (
    <Panel className="mt-4">
      <SectionHeader
        kicker="Pedido"
        title={
          <h3 className="font-[var(--isalwa-font-display)] text-lg text-[var(--isalwa-kiln)] italic">
            {ORDER_PREP_COPY.cardTitle}
          </h3>
        }
      />
      <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">{ORDER_PREP_COPY.cardIntro}</p>
      <ul className="space-y-4">
        {DEPARTMENTS.map((department) => {
          const copy = ORDER_PREP_COPY[department];
          const assignee = assignees?.[department]?.trim() ?? '';
          const needsAssignee = !assignee;
          return (
            <li key={department} className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] p-4">
              <p className="isalwa-section-label">{copy.title}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{copy.body}</p>
              {needsAssignee ? (
                <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{ORDER_PREP_COPY.noAssignee}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending === department}
                  onClick={() => handleReview(department)}
                >
                  {copy.action}
                </Button>
                {needsAssignee && onAssignResponsible ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onAssignResponsible(department)}>
                    {ORDER_PREP_COPY.assignOwner}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {notice ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]" role="status">
          {notice}
        </p>
      ) : null}
    </Panel>
  );
}
