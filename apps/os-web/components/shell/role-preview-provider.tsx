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
import { ROLE_PREVIEW_PRESETS } from '@/lib/role-preview/presets';
import {
  parseStoredRolePreview,
  rolePreviewStorageKey,
  writeStoredRolePreview,
} from '@/lib/role-preview/storage';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

type RolePreviewContextValue = {
  persona: RolePreviewPersonaId | null;
  active: boolean;
  presentationScopes: readonly string[];
  blocksMutations: boolean;
  setPersona: (persona: RolePreviewPersonaId | 'own') => void;
  resetToMyView: () => void;
  presets: typeof ROLE_PREVIEW_PRESETS;
};

const RolePreviewContext = createContext<RolePreviewContextValue | null>(null);

export function RolePreviewProvider({
  actorKey,
  grantedScopes,
  children,
}: {
  actorKey: string | null;
  grantedScopes: readonly string[];
  children: ReactNode;
}) {
  const storageKey = actorKey ? rolePreviewStorageKey(actorKey) : null;
  const [persona, setPersonaState] = useState<RolePreviewPersonaId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setPersonaState(null);
      setHydrated(true);
      return;
    }
    setPersonaState(parseStoredRolePreview(window.localStorage.getItem(storageKey)));
    setHydrated(true);
  }, [storageKey]);

  const setPersona = useCallback(
    (next: RolePreviewPersonaId | 'own') => {
      const resolved = next === 'own' ? null : next;
      setPersonaState(resolved);
      if (!storageKey) return;
      writeStoredRolePreview(storageKey, resolved);
    },
    [storageKey],
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
      active,
      presentationScopes,
      blocksMutations,
      setPersona,
      resetToMyView,
      presets: ROLE_PREVIEW_PRESETS,
    }),
    [active, blocksMutations, persona, presentationScopes, resetToMyView, setPersona],
  );

  return <RolePreviewContext.Provider value={value}>{children}</RolePreviewContext.Provider>;
}

export function useRolePreview(): RolePreviewContextValue {
  const ctx = useContext(RolePreviewContext);
  if (!ctx) {
    return {
      persona: null,
      active: false,
      presentationScopes: [],
      blocksMutations: false,
      setPersona: () => undefined,
      resetToMyView: () => undefined,
      presets: ROLE_PREVIEW_PRESETS,
    };
  }
  return ctx;
}
