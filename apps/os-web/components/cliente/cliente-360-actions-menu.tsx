'use client';

import { useEffect, useState } from 'react';
import { Button, ContextDrawer } from '@isalwa/ui';
import { CustomerEditForms } from '@/components/party/customer-edit-forms';
import { ReassignOwnerForm } from '@/components/party/reassign-owner-form';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { CommitmentRecordForm } from '@/components/commitments/commitment-record-form';
import { ManualOperationsPanel } from '@/components/operations/manual-operations-panel';
import { ReportIssueDrawer } from '@/components/issue/report-issue-drawer';
import { ISSUE_COPY } from '@/lib/issue/labels';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import type { ReportIssueContext } from '@/lib/issue/types';
import type { PartyDetailResponse } from '@/lib/party/types';
import { Cliente360LocationCreateDrawer } from '@/components/party/cliente-360-location-create-drawer';

type DrawerKind =
  | 'follow_up'
  | 'issue'
  | 'commitment'
  | 'contact'
  | 'location'
  | 'edit_party'
  | 'reassign_owner'
  | 'manual_ops';

export type Cliente360ActionsMenuProps = {
  partyId: string;
  party: PartyDetailResponse['party'];
  contacts: PartyDetailResponse['contacts'];
  canEditParty: boolean;
  canEditContacts: boolean;
  canReassignOwner: boolean;
  /** When false, hide all mutating menu entries (Vista de evaluación). */
  allowMutations?: boolean;
  ownerLabel: string;
  commercialAccountId: string | null;
  currentOwnerMemberId: string | null;
  issueContext: ReportIssueContext;
  reportedByLabel?: string;
  organizationId: string;
  actorMemberId: string;
  manualSubjectLabel: string;
  manualOrganizationId: string;
  manualSubjectId: string;
};

const menuItemClass =
  'block w-full rounded-[var(--isalwa-radius-control)] px-3 py-2 text-left text-sm text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]';

export function Cliente360ActionsMenu(props: Cliente360ActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: DrawerKind }>).detail;
      if (detail?.kind) {
        setDrawer(detail.kind);
      }
    };
    document.addEventListener('cliente360:open-drawer', onOpen);
    return () => document.removeEventListener('cliente360:open-drawer', onOpen);
  }, []);

  function open(kind: DrawerKind) {
    setMenuOpen(false);
    setDrawer(kind);
  }

  function closeDrawer() {
    setDrawer(null);
  }

  const showManual =
    Boolean(props.manualOrganizationId && props.manualSubjectId && props.reportedByLabel?.trim());
  const allowMutations = props.allowMutations !== false;

  return (
    <>
      <div className="relative">
        <Button type="button" variant="secondary" onClick={() => setMenuOpen((open) => !open)}>
          {CLIENTE360_UX_COPY.actionsMenu}
        </Button>
        {menuOpen ? (
          <div className="absolute right-0 z-20 mt-2 min-w-[14rem] rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white py-2 shadow-[var(--isalwa-shadow-soft)]">
            {!allowMutations ? (
              <p className="px-3 py-2 text-sm text-[var(--isalwa-slate)]">
                Vista de evaluación: sin acciones de cambio.
              </p>
            ) : (
              <>
            <button type="button" className={menuItemClass} onClick={() => open('issue')}>
              {ISSUE_COPY.reportAction}
            </button>
            {props.actorMemberId ? (
              <button type="button" className={menuItemClass} onClick={() => open('commitment')}>
                Registrar compromiso
              </button>
            ) : null}
            <button type="button" className={menuItemClass} onClick={() => open('follow_up')}>
              {CLIENTE360_UX_COPY.scheduleFollowUp}
            </button>
            {props.canEditContacts ? (
              <button type="button" className={menuItemClass} onClick={() => open('contact')}>
                Agregar contacto
              </button>
            ) : null}
            {props.canEditParty ? (
              <button type="button" className={menuItemClass} onClick={() => open('location')}>
                Agregar ubicación
              </button>
            ) : null}
            {props.canEditParty ? (
              <button type="button" className={menuItemClass} onClick={() => open('edit_party')}>
                Editar cliente
              </button>
            ) : null}
            {props.canReassignOwner && props.commercialAccountId ? (
              <button type="button" className={menuItemClass} onClick={() => open('reassign_owner')}>
                Cambiar responsable
              </button>
            ) : null}
            {showManual ? (
              <button type="button" className={menuItemClass} onClick={() => open('manual_ops')}>
                {CLIENTE360_UX_COPY.manualOpsDrawer}
              </button>
            ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      <ContextDrawer open={drawer === 'follow_up'} title={CLIENTE360_UX_COPY.scheduleFollowUp} onClose={closeDrawer}>
        <RegisterFollowUpForm partyId={props.partyId} />
      </ContextDrawer>

      <ReportIssueDrawer
        open={drawer === 'issue'}
        onOpenChange={(open) => (open ? setDrawer('issue') : closeDrawer())}
        context={props.issueContext}
        reportedByLabel={props.reportedByLabel}
      />

      <ContextDrawer open={drawer === 'commitment'} title="Registrar compromiso" onClose={closeDrawer}>
        {props.actorMemberId ? (
          <CommitmentRecordForm
            organizationId={props.organizationId}
            ownerMemberId={props.actorMemberId}
            partyId={props.partyId}
            onSaved={closeDrawer}
          />
        ) : null}
      </ContextDrawer>

      <ContextDrawer open={drawer === 'contact'} title="Agregar contacto" onClose={closeDrawer}>
        <CustomerEditForms party={props.party} contacts={props.contacts} canEditParty={false} canEditContacts={props.canEditContacts} />
      </ContextDrawer>

      <ContextDrawer open={drawer === 'edit_party'} title="Editar cliente" onClose={closeDrawer}>
        <CustomerEditForms party={props.party} contacts={props.contacts} canEditParty={props.canEditParty} canEditContacts={false} />
      </ContextDrawer>

      <Cliente360LocationCreateDrawer
        open={drawer === 'location'}
        partyId={props.partyId}
        onClose={closeDrawer}
      />

      <ContextDrawer open={drawer === 'reassign_owner'} title="Cambiar responsable" onClose={closeDrawer}>
        {props.commercialAccountId ? (
          <ReassignOwnerForm
            partyId={props.partyId}
            commercialAccountId={props.commercialAccountId}
            currentOwnerLabel={props.ownerLabel}
            currentOwnerMemberId={props.currentOwnerMemberId ?? undefined}
          />
        ) : null}
      </ContextDrawer>

      <ContextDrawer open={drawer === 'manual_ops'} title={CLIENTE360_UX_COPY.manualOpsDrawer} onClose={closeDrawer}>
        {showManual ? (
          <ManualOperationsPanel
            organizationId={props.manualOrganizationId}
            subjectType="party"
            subjectId={props.manualSubjectId}
            subjectLabel={props.manualSubjectLabel}
            reportedByLabel={props.reportedByLabel!.trim()}
          />
        ) : null}
      </ContextDrawer>
    </>
  );
}
