"use client";

import { useEffect, useState } from "react";
import type { ArchitectSession } from "@/types/auth";

/**
 * Client hook for reading session from /api/auth/session.
 * Business rules stay in lib/auth — this is display-only state.
 */
export function useAuth() {
  const [session, setSession] = useState<ArchitectSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { session: ArchitectSession | null }) => {
        if (!cancelled) setSession(data.session);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, loading };
}
