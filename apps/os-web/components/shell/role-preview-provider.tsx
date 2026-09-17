'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { effectiveNavScopes, rolePreviewBlocksMutations } from '@/lib/role-preview/access';
import { syncRolePreviewPersonaCookie } from '@/lib/role-preview/persona-cookie';
import { ROLE_PREVIEW_PRESETS } from '@/lib/role-preview/presets';
import {
  parseStoredRolePreview,
  rolePreviewStorageKey,
  writeStoredRolePreview,
} from '@/lib/role-preview/storage';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

type RolePreviewContextValue = {
  persona: RolePreviewPersonaId | null;
  subjectMemberId: string | null;
  active: boolean;
  presentationScopes: readonly string[];
  blocksMutations: boolean;
  setPersona: (persona: RolePreviewPersonaId | 'own', subjectMemberId?: string | null) => void;
  resetToMyView: () => void;
  presets: typeof ROLE_PREVIEW_PRESETS;
  asesorOptions: readonly { memberId: string; label: string }[];
};

const RolePreviewContext = createContext<RolePreviewContextValue | null>(null);

export function RolePreviewProvider({
  actorKey,
  grantedScopes,
  asesorOptions = [],
  children,
}: {
  actorKey: string | null;
  grantedScopes: readonly string[];
  asesorOptions?: readonly { memberId: string; label: string }[];
  children: ReactNode;
}) {
  const storageKey = actorKey ? rolePreviewStorageKey(actorKey) : null;
  const [persona, setPersonaState] = useState<RolePreviewPersonaId | null>(null);
  const [subjectMemberId, setSubjectMemberId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setPersonaState(null);
      setSubjectMemberId(null);
      syncRolePreviewPersonaCookie(null);
      setHydrated(true);
      return;
    }
    const raw = window.localStorage.getItem(storageKey);
    const stored = parseStoredRolePreview(raw?.includes('::') ? raw.slice(0, raw.indexOf('::')) : raw);
    const subject =
      raw?.includes('::') && stored === 'asesor' ? raw.slice(raw.indexOf('::') + 2).trim() || null : null;
    setPersonaState(stored);
    setSubjectMemberId(subject);
    syncRolePreviewPersonaCookie(stored, subject);
    setHydrated(true);
  }, [storageKey]);

  const setPersona = useCallback(
    (next: RolePreviewPersonaId | 'own', nextSubject?: string | null) => {
      const resolved = next === 'own' ? null : next;
      const subject =
        resolved === 'asesor' ? (nextSubject?.trim() || subjectMemberId || asesorOptions[0]?.memberId || null) : null;
      setPersonaState(resolved);
      setSubjectMemberId(subject);
      syncRolePreviewPersonaCookie(resolved, subject);
      if (!storageKey) return;
      if (!resolved) {
        writeStoredRolePreview(storageKey, null);
        return;
      }
      const encoded =
        resolved === 'asesor' && subject ? `${resolved}::${subject}` : resolved;
      window.localStorage.setItem(storageKey, encoded);
    },
    [storageKey, subjectMemberId, asesorOptions],
  );

  const resetToMyView = useCallback(() => setPersona('own'), [setPersona]);

  const active = hydrated && persona !== null;
  const presentationScopes = useMemo(
    () => effectiveNavScopes(grantedScopes, persona),
    [grantedScopes, persona],
  );
  const blocksMutations = rolePreviewBlocksMutations(persona);

  const value = useMemo(
    (): RolePreviewContextValue => ({
      persona,
      subjectMemberId,
      active,
      presentationScopes,
      blocksMutations,
      setPersona,
      resetToMyView,
      presets: ROLE_PREVIEW_PRESETS,
      asesorOptions,
    }),
    [
      active,
      asesorOptions,
      blocksMutations,
      persona,
      presentationScopes,
      resetToMyView,
      setPersona,
      subjectMemberId,
    ],
  );

  return <RolePreviewContext.Provider value={value}>{children}</RolePreviewContext.Provider>;
}

export function useRolePreview(): RolePreviewContextValue {
  const ctx = useContext(RolePreviewContext);
  if (!ctx) {
    return {
      persona: null,
      subjectMemberId: null,
      active: false,
      presentationScopes: [],
      blocksMutations: false,
      setPersona: () => undefined,
      resetToMyView: () => undefined,
      presets: ROLE_PREVIEW_PRESETS,
      asesorOptions: [],
    };
  }
  return ctx;
}
