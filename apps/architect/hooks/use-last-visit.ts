"use client";

import { useEffect, useRef, useState } from "react";
import type { LastVisitSnapshot } from "@/lib/consulting-intelligence";

const STORAGE_PREFIX = "architect.lastVisit.";

function storageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

/**
 * Executive Daily Brief (Mission 20) — a purely presentational "what did
 * this workspace look like the last time this browser opened it" pointer.
 *
 * This is intentionally client-storage only, never a workspace field: it
 * has nothing to do with Discovery, the Readiness Engine, the Capability
 * Twin, Memory or the Consulting Intelligence cycle — none of them have (or
 * need) a concept of "a visit". It exists solely so the brief can honestly
 * say what changed since Álvaro last looked, and just as honestly say
 * "nothing yet" the first time this browser ever opens the workspace.
 *
 * Reads the previous snapshot once per workspace mount, then immediately
 * writes the current one — so the *next* visit compares against *this*
 * one, never against itself.
 */
export function useLastVisit(
  workspaceId: string,
  currentBusinessUnderstanding: number,
  /** Wait until the real workspace has loaded — never record a visit against a placeholder `0`. */
  ready: boolean,
): { previous: LastVisitSnapshot | null } {
  const [previous, setPrevious] = useState<LastVisitSnapshot | null>(null);
  const recordedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ready) return;
    if (recordedForRef.current === workspaceId) return;
    recordedForRef.current = workspaceId;

    const key = storageKey(workspaceId);
    let stored: LastVisitSnapshot | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      stored = raw ? (JSON.parse(raw) as LastVisitSnapshot) : null;
    } catch {
      stored = null;
    }

    setPrevious(stored);

    try {
      const snapshot: LastVisitSnapshot = {
        visitedAt: new Date().toISOString(),
        businessUnderstanding: currentBusinessUnderstanding,
      };
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // Storage unavailable (private mode, quota) — the brief still renders,
      // just always as a first visit.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, ready]);

  return { previous };
}
