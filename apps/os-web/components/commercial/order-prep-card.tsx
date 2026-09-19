'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Panel, SectionHeader } from '@isalwa/ui';
import {
  ORDER_PREP_COPY,
  canRequestOrderPrepReview,
  type OrderPrepDepartment,
  type OrderPrepOpenReview,
} from '@/components/commercial/order-prep-work';
import { requestOrderPrepReviewAction } from '@/lib/commercial/order-prep-actions';
import { AppToast, AppToastRegion } from '@/components/states/app-toast';
import { workItemHref } from '@/lib/work/navigation';
import { PURCHASING_REPEAT_REQUEST } from '@/lib/purchasing/resolve-review-copy';

export type OrderPrepCardProps = {
  orderId: string;
  partyId: string;
  actorMemberId: string;
  orderLabel?: string | null;
  assignees?: Partial<Record<OrderPrepDepartment, string | null>>;
  openReviews?: Partial<Record<OrderPrepDepartment, OrderPrepOpenReview>>;
  /** True when a Compras result was already returned. A new request stays allowed. */
  purchasingResultRecorded?: boolean;
  /** Optional factual warehouse evidence — never stock yes/no claims. */
  warehouseEvidence?: string | null;
  canMutate?: boolean;
};

const DEPARTMENTS: OrderPrepDepartment[] = ['production', 'warehouse', 'purchasing'];

export function OrderPrepCard({
  orderId,
  partyId,
  actorMemberId,
  orderLabel,
  assignees,
  openReviews: initialOpen,
  purchasingResultRecorded = false,
  warehouseEvidence,
  canMutate = true,
}: OrderPrepCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyDept, setBusyDept] = useState<OrderPrepDepartment | null>(null);
  const [openReviews, setOpenReviews] = useState(initialOpen ?? {});
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleReview(department: OrderPrepDepartment) {
    if (openReviews[department]) return;
    const assignee = assignees?.[department] ?? null;
    if (!canRequestOrderPrepReview(department, assignee)) {
      setError(ORDER_PREP_COPY[department].noAssignee);
      return;
    }
    setBusyDept(department);
    setError(null);
    startTransition(async () => {
      const result = await requestOrderPrepReviewAction({
        department,
        orderId,
        partyId,
        actorMemberId,
        assigneeMemberId: assignee,
        orderLabel,
      });
      setBusyDept(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpenReviews((prev) => ({
        ...prev,
        [department]: {
          department,
          workItemId: result.workItemId,
          title: ORDER_PREP_COPY[department].requested,
        },
      }));
      if (!result.alreadyOpen) {
        setToast(ORDER_PREP_COPY.toastOk);
      }
      router.refresh();
    });
  }

  return (
    <Panel className="mt-10">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {ORDER_PREP_COPY.cardTitle}
          </h2>
        }
      />
      <p className="mb-6 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {ORDER_PREP_COPY.cardIntro}
      </p>
      <ul className="space-y-4">
        {DEPARTMENTS.map((department) => {
          const copy = ORDER_PREP_COPY[department];
          const assignee = assignees?.[department]?.trim() ?? '';
          const open = openReviews[department];
          const mayRequest = canRequestOrderPrepReview(department, assignee);
          return (
            <li
              key={department}
              className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] p-4"
            >
              <p className="isalwa-section-label">{copy.title}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{copy.body}</p>
              {department === 'warehouse' && warehouseEvidence ? (
                <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">{warehouseEvidence}</p>
              ) : null}
              {open ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]" role="status">
                    {copy.requested}
                  </p>
                  <Link
                    href={workItemHref(open.workItemId)}
                    className="isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
                  >
                    {ORDER_PREP_COPY.viewWork}
                  </Link>
                </div>
              ) : !mayRequest ? (
                <p className="mt-3 text-sm text-[var(--isalwa-slate)]">{copy.noAssignee}</p>
              ) : canMutate ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending && busyDept === department}
                    onClick={() => handleReview(department)}
                  >
                    {department === 'purchasing' && purchasingResultRecorded
                      ? PURCHASING_REPEAT_REQUEST
                      : copy.action}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--isalwa-slate)]">Sin solicitud de revisión.</p>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]" role="status">
          {error}
        </p>
      ) : null}
      {toast ? (
        <AppToastRegion className="fixed bottom-4 right-4 z-50" label="Confirmación">
          <AppToast
            tone="success"
            title={toast}
            onDismiss={() => setToast(null)}
          />
        </AppToastRegion>
      ) : null}
    </Panel>
  );
}
