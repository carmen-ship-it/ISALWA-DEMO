'use client';

import { useState } from 'react';
import { Button, ContextDrawer } from '@isalwa/ui';
import { CommitmentRecordForm } from '@/components/commitments/commitment-record-form';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';

type CommitmentCreateDrawerProps = {
  organizationId: string;
  actorMemberId: string;
  actorLabel: string;
};

/** "Crear compromiso" on the desk: the same record form, with a responsible member and an optional customer. */
export function CommitmentCreateDrawer({ organizationId, actorMemberId, actorLabel }: CommitmentCreateDrawerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {COMMITMENT_COPY.create}
      </Button>
      <ContextDrawer open={open} title={COMMITMENT_COPY.create} onClose={() => setOpen(false)}>
        <CommitmentRecordForm
          organizationId={organizationId}
          ownerMemberId={actorMemberId}
          actorLabel={actorLabel}
          chooseResponsible
          onSaved={() => setOpen(false)}
        />
      </ContextDrawer>
    </>
  );
}
