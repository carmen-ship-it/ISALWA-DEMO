"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CONNECTORS,
  KNOWLEDGE_PIPELINE,
  ensureWorkspaceKnowledge,
} from "@/lib/knowledge";
import { formatRelativeActivity } from "@/lib/workspace";
import type { KnowledgeCategory, WorkspaceKnowledge } from "@/types";

export function KnowledgeCenter({
  knowledge,
}: {
  knowledge: WorkspaceKnowledge | null | undefined;
}) {
  const vault = ensureWorkspaceKnowledge(knowledge);
  const processed = vault.assets.filter((a) => a.status === "processed");
  const byCategory = groupByCategory(vault);

  return (
    <div className="space-y-8">
      <Card className="px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Knowledge Summary
        </p>
        <p className="mt-3 text-neutral-800">
          {vault.summary ??
            "No company knowledge analyzed yet. Future uploads will land here as evidence."}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Meta
            label="Documents"
            value={String(processed.length)}
          />
          <Meta
            label="Last Analysis"
            value={
              vault.lastAnalysisAt
                ? formatRelativeActivity(vault.lastAnalysisAt)
                : "—"
            }
          />
          <Meta
            label="Entities Found"
            value={String(vault.entities.length)}
          />
        </div>
        {vault.unknownAreas.length > 0 ? (
          <p className="mt-5 text-sm text-neutral-500">
            Unknown areas: {vault.unknownAreas.join(" · ")}
          </p>
        ) : null}
      </Card>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Coverage
        </p>
        <ul className="mt-4 space-y-3">
          {vault.coverage.map((slice) => (
            <li
              key={slice.area}
              className="flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-neutral-800">{slice.area}</span>
                  <span className="tabular-nums text-neutral-950">
                    {slice.percent}%
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-800 transition-all"
                    style={{ width: `${slice.percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">{slice.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Knowledge Vault
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Evidence — not attachments. Upload is designed, not built.
        </p>
        <div className="mt-5 space-y-6">
          {KNOWLEDGE_CATEGORIES.map((category) => {
            const items = byCategory.get(category) ?? [];
            return (
              <div key={category}>
                <p className="text-sm text-neutral-950">{category}</p>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-400">Empty</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-neutral-900">{item.title}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {item.source}
                            {item.summary ? ` · ${item.summary}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                          {item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {vault.entities.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Knowledge Graph · Entities
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {vault.entities.map((entity) => (
              <li
                key={entity.id}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600"
              >
                {entity.kind}: {entity.name}
              </li>
            ))}
          </ul>
          {vault.relationships.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              {vault.relationships.slice(0, 5).map((relationship) => (
                <li key={relationship.id}>
                  {relationship.kind} — {relationship.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Processing Pipeline
        </p>
        <ol className="mt-4 space-y-2">
          {KNOWLEDGE_PIPELINE.map((stage, index) => (
            <li
              key={stage.id}
              className="flex gap-3 text-sm text-neutral-600"
            >
              <span className="tabular-nums text-neutral-400">
                {index + 1}.
              </span>
              <span>
                <span className="text-neutral-900">{stage.title}</span>
                {" — "}
                {stage.description}
                <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                  {stage.status}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Future Connectors
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {KNOWLEDGE_CONNECTORS.slice(0, 8).map((connector) => (
            <li
              key={connector.id}
              className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-neutral-900">{connector.title}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                {connector.status}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-neutral-950">{value}</p>
    </div>
  );
}

function groupByCategory(knowledge: WorkspaceKnowledge) {
  const map = new Map<KnowledgeCategory, typeof knowledge.assets>();
  for (const category of KNOWLEDGE_CATEGORIES) {
    map.set(category, []);
  }
  for (const asset of knowledge.assets) {
    const list = map.get(asset.category) ?? [];
    list.push(asset);
    map.set(asset.category, list);
  }
  return map;
}

export function KnowledgeSectionShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
