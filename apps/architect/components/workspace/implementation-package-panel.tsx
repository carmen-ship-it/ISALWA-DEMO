"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  evaluateImplementationGate,
  generateImplementationPackage,
  IMPLEMENTATION_PACKAGE_THRESHOLD,
  readImplementationPackageState,
} from "@/lib/implementation-package";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

/**
 * Thin Mission 18 UI — Ready / Not ready + section list when threshold met.
 * Architecture references only; no code generation.
 */
export function ImplementationPackagePanel({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const [busy, setBusy] = useState(false);
  const live = useMemo(
    () => readImplementationPackageState(workspace),
    [workspace],
  );
  const gate = workspace.implementationPackage?.gate ?? live.gate;
  const pack = workspace.implementationPackage ?? live.pack;

  const refresh = async () => {
    setBusy(true);
    try {
      await generateImplementationPackage(workspace.id);
      const refreshed = await getClientCompanyMemoryStore().workspaces.get(
        workspace.id,
      );
      if (refreshed) onUpdated(refreshed);
      else {
        const nextPack = assembleLocal(workspace);
        onUpdated({
          ...workspace,
          implementationPackage: nextPack,
          updatedAt: nextPack?.generatedAt ?? workspace.updatedAt,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Paquete de implementación
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          {gate.ready ? "Listo" : "No listo"}
        </h3>
        <p className="mt-3 text-neutral-600">
          Umbral de comprensión: {IMPLEMENTATION_PACKAGE_THRESHOLD}% · actual{" "}
          {gate.businessUnderstanding}%
          {gate.thresholdMet ? " · umbral alcanzado" : " · umbral pendiente"}
        </p>
        <ul className="mt-4 space-y-2">
          {gate.notes.map((note) => (
            <li key={note} className="text-sm text-neutral-700">
              {note}
            </li>
          ))}
        </ul>
        {gate.missingPrerequisites.length > 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Falta: {gate.missingPrerequisites.join(" · ")}
          </p>
        ) : null}
        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {busy ? "Actualizando…" : "Actualizar paquete"}
          </Button>
        </div>
      </Card>

      {pack ? (
        <Card className="px-5 py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Secciones · {formatRelativeActivity(pack.generatedAt)}
          </p>
          <p className="mt-2 text-sm text-neutral-600">{pack.summary}</p>
          <ol className="mt-6 space-y-4">
            {pack.sections.map((section) => (
              <li
                key={section.id}
                className="rounded-2xl border border-neutral-200/70 bg-white/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-950">
                      {section.title}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {section.summary}
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                      {section.sourceEngine}
                      {section.artifacts[0]
                        ? ` · ${section.artifacts.length} refs`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={
                      section.available
                        ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                        : "shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500"
                    }
                  >
                    {section.available ? "Disponible" : "Pendiente"}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="px-5 py-5">
          <p className="text-sm text-neutral-600">
            El paquete aparece cuando la comprensión del negocio alcanza el
            umbral de conclusión ({IMPLEMENTATION_PACKAGE_THRESHOLD}%). Hasta
            entonces Architect sigue en descubrimiento — sin código ni prompts.
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            Gate actual: {evaluateImplementationGate(workspace).status}
          </p>
        </Card>
      )}
    </div>
  );
}

function assembleLocal(workspace: CompanyWorkspace) {
  return readImplementationPackageState(workspace).pack;
}
