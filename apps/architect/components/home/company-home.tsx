"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { Button } from "@/components/ui/button";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { searchCompanyMemory } from "@/lib/search";
import { createEmptyWorkspace, formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace, SearchHit } from "@/types";

export function CompanyHome() {
  const router = useRouter();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspaces, setWorkspaces] = useState<CompanyWorkspace[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    void store.workspaces.list().then(setWorkspaces);
  }, [store]);

  useEffect(() => {
    setHits(searchCompanyMemory(workspaces, query));
  }, [query, workspaces]);

  async function createCompany() {
    const name = newName.trim();
    if (!name) return;
    const workspace = createEmptyWorkspace(name);
    await store.workspaces.save(workspace);
    setCreating(false);
    setNewName("");
    router.push(`/workspace/${workspace.id}?fresh=1`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
            ISALWA Architect
          </p>
          <h1 className="architect-serif mt-4 text-4xl leading-tight text-neutral-950 sm:text-5xl">
            Your Companies
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-600">
            Living consulting workspaces. Every interview becomes permanent
            company memory.
          </p>
        </div>
        <ArchitectNav />
      </header>

      <div className="mt-10">
        <label className="sr-only" htmlFor="company-search">
          Search company memory
        </label>
        <input
          id="company-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search companies, knowledge, people…"
          className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3.5 text-sm text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-neutral-400"
        />
        {hits.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-3xl border border-neutral-200/80 bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <Link
                  href={hit.href}
                  className="block rounded-2xl px-4 py-3 transition hover:bg-neutral-50"
                >
                  <p className="text-sm font-medium text-neutral-900">
                    {hit.title}
                  </p>
                  <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-neutral-400">
                    {hit.kind.replace("_", " ")} · {hit.subtitle}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ul className="mt-10 space-y-3">
        {workspaces.map((workspace, index) => (
          <motion.li
            key={workspace.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.04 }}
          >
            <Link
              href={`/workspace/${workspace.id}`}
              className="group flex items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition hover:border-neutral-300"
            >
              <div>
                <p className="text-lg text-neutral-950 group-hover:text-neutral-800">
                  {workspace.companyName}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {workspace.currentStage} · {workspace.businessUnderstanding}%
                  understood · {formatRelativeActivity(workspace.lastActivityAt)}
                </p>
              </div>
              <span className="text-sm text-neutral-400 transition group-hover:text-neutral-700">
                Open
              </span>
            </Link>
          </motion.li>
        ))}

        <motion.li
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: workspaces.length * 0.04 }}
        >
          {creating ? (
            <div className="rounded-3xl border border-neutral-200/80 bg-white px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                New Company
              </p>
              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createCompany();
                }}
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Company name"
                  className="flex-1 rounded-full border border-neutral-200 bg-white px-5 py-3 text-base outline-none focus:border-neutral-400"
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={!newName.trim()}>
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center justify-between rounded-3xl border border-dashed border-neutral-300 bg-transparent px-6 py-5 text-left transition hover:border-neutral-400 hover:bg-white/60"
            >
              <span className="text-lg text-neutral-700">+ New Company</span>
              <span className="text-sm text-neutral-400">Start discovery</span>
            </button>
          )}
        </motion.li>
      </ul>

      <p className="mt-16 text-sm text-neutral-400">
        Company memory persists locally until collaborative sync arrives.
      </p>
    </main>
  );
}
