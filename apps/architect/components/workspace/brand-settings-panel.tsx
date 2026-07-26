"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  applyBrandOverrides,
  emptyBrandOverrides,
  terminologyOverrideKey,
} from "@/lib/brand";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type { BrandOverrides, CompanyWorkspace } from "@/types";

/**
 * White Label Company Experience — consultant-only configuration surface.
 *
 * Extends Mission 10's Brand & Experience Studio: it does not re-derive or
 * replace anything in `lib/brand/`. It edits `workspace.brandOverrides`
 * (independent of `brandExperience`, never wiped on blueprint regeneration)
 * and every field maps onto something the brand engine already models —
 * see WHITE_LABEL_EXPERIENCE.md for the full field-by-field mapping and gaps.
 */
export function BrandSettingsPanel({
  workspace,
  updatedByLabel,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  updatedByLabel: string;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const saved = workspace.brandOverrides;
  const [draft, setDraft] = useState<BrandOverrides>(
    saved ?? emptyBrandOverrides(),
  );
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(saved?.updatedAt ?? null);

  const effective = useMemo(
    () =>
      applyBrandOverrides(
        workspace.brandExperience,
        workspace.brandOverrides,
        workspace.companyName,
      ),
    [workspace.brandExperience, workspace.brandOverrides, workspace.companyName],
  );

  const draftPreview = useMemo(
    () => applyBrandOverrides(workspace.brandExperience, draft, workspace.companyName),
    [workspace.brandExperience, draft, workspace.companyName],
  );

  const businessTerms = workspace.brandExperience?.terminology.entries.filter(
    (e) => e.term !== "Department",
  ) ?? [];
  const departmentTerms = workspace.brandExperience?.terminology.entries.filter(
    (e) => e.term === "Department",
  ) ?? [];

  function setTerminology(entryKey: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      terminologyOverrides: {
        ...prev.terminologyOverrides,
        [entryKey]: value,
      },
    }));
  }

  async function save(next: BrandOverrides) {
    setBusy(true);
    try {
      const stamped: BrandOverrides = {
        ...next,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedByLabel,
      };
      const savedWorkspace = await getClientCompanyMemoryStore().workspaces.save({
        ...workspace,
        brandOverrides: stamped,
      });
      setDraft(stamped);
      setSavedAt(stamped.updatedAt);
      onUpdated(savedWorkspace);
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    void save(emptyBrandOverrides());
  }

  return (
    <div className="space-y-6">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Marca blanca
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Personalizar la experiencia de {workspace.companyName}
        </h3>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Lo que configure aquí se aplica automáticamente en el espacio de
          trabajo, el resumen de bienvenida y el reporte — sin tocar el motor
          de marca. Los campos vacíos siguen usando la recomendación derivada
          del diagnóstico.
        </p>
        <p className="mt-4 text-sm text-neutral-400">
          {savedAt
            ? `Guardado · ${formatRelativeActivity(savedAt)} · por ${draft.updatedBy ?? updatedByLabel}`
            : "Aún sin personalizar — usando valores derivados del motor de marca."}
        </p>
      </Card>

      <Card className="space-y-6 px-5 py-6">
        <FieldGroup title="Identidad">
          <TextField
            label="URL del logo"
            value={draft.logoUrl ?? ""}
            placeholder="https://…/logo.png"
            help="Se usa en el encabezado del espacio de trabajo y en el reporte."
            onChange={(v) => setDraft((p) => ({ ...p, logoUrl: v || null }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Color primario"
              value={draft.primaryColor}
              derivedHex={effective.primaryColor.source === "derived" ? effective.primaryColor.value : null}
              onChange={(v) => setDraft((p) => ({ ...p, primaryColor: v }))}
            />
            <ColorField
              label="Color de acento"
              value={draft.accentColor}
              derivedHex={effective.accentColor.source === "derived" ? effective.accentColor.value : null}
              onChange={(v) => setDraft((p) => ({ ...p, accentColor: v }))}
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Industria y mensaje">
          <TextAreaField
            label="Cómo describir la industria de esta empresa"
            value={draft.industryPositioning ?? ""}
            placeholder={
              workspace.brandExperience?.brandProfile.industryPositioning.value ??
              "Ej.: Manufactura de precisión para clientes industriales exigentes."
            }
            help="Reemplaza el posicionamiento de industria sugerido por el motor de marca."
            onChange={(v) =>
              setDraft((p) => ({ ...p, industryPositioning: v || null }))
            }
          />
          <TextAreaField
            label="Mensaje de bienvenida en el espacio de trabajo"
            value={draft.homepageMessage ?? ""}
            placeholder={`Ej.: Bienvenido al sistema operativo de ${workspace.companyName}.`}
            help="Sustituye el mensaje automático en la pestaña Resumen — visible para el cliente."
            onChange={(v) =>
              setDraft((p) => ({ ...p, homepageMessage: v || null }))
            }
          />
          <TextField
            label="Estilo de ilustración preferido"
            value={draft.illustrationStyle ?? ""}
            placeholder="Ej.: línea minimalista, editorial fotográfico, isométrico…"
            help="Se guarda para uso futuro — todavía no existe un sistema de ilustraciones conectado a la interfaz (ver gaps en WHITE_LABEL_EXPERIENCE.md)."
            onChange={(v) =>
              setDraft((p) => ({ ...p, illustrationStyle: v || null }))
            }
          />
        </FieldGroup>

        {businessTerms.length > 0 ? (
          <FieldGroup title="Terminología del negocio">
            <div className="space-y-3">
              {businessTerms.map((entry) => {
                const key = terminologyOverrideKey(entry);
                return (
                  <TerminologyRow
                    key={key}
                    term={entry.term}
                    derivedLabel={entry.preferredLabel}
                    context={entry.context}
                    value={draft.terminologyOverrides[key] ?? ""}
                    onChange={(v) => setTerminology(key, v)}
                  />
                );
              })}
            </div>
          </FieldGroup>
        ) : null}

        {departmentTerms.length > 0 ? (
          <FieldGroup title="Nombres de departamentos">
            <div className="space-y-3">
              {departmentTerms.map((entry) => {
                const key = terminologyOverrideKey(entry);
                return (
                  <TerminologyRow
                    key={key}
                    term="Departamento"
                    derivedLabel={entry.preferredLabel}
                    context={entry.context}
                    value={draft.terminologyOverrides[key] ?? ""}
                    onChange={(v) => setTerminology(key, v)}
                  />
                );
              })}
            </div>
          </FieldGroup>
        ) : null}

        <FieldGroup title="Marca en reportes">
          <label className="flex items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={draft.reportBranding.showLogoOnReports}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  reportBranding: {
                    ...p.reportBranding,
                    showLogoOnReports: e.target.checked,
                  },
                }))
              }
              className="h-4 w-4 rounded border-neutral-300"
            />
            Mostrar el logo en los reportes
          </label>
          <TextField
            label="Texto de pie de página del reporte"
            value={draft.reportBranding.footerText ?? ""}
            placeholder="Ej.: Preparado exclusivamente para uso interno."
            onChange={(v) =>
              setDraft((p) => ({
                ...p,
                reportBranding: { ...p.reportBranding, footerText: v || null },
              }))
            }
          />
        </FieldGroup>

        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-5">
          <Button onClick={() => void save(draft)} disabled={busy}>
            {busy ? "Guardando…" : "Guardar configuración de marca"}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={handleReset}
            disabled={busy}
          >
            Restablecer a valores derivados
          </Button>
        </div>
      </Card>

      <Card className="px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Vista previa
        </p>
        <div className="mt-3 flex items-center gap-3">
          {draftPreview.logoUrl.value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draftPreview.logoUrl.value}
              alt={`Logo de ${workspace.companyName}`}
              className="h-8 w-8 rounded-lg border border-neutral-200 object-contain"
            />
          ) : null}
          <span
            className="h-6 w-6 rounded-full border border-neutral-200"
            style={{ background: draftPreview.primaryColor.value ?? "transparent" }}
            title="Color primario"
          />
          <span
            className="h-6 w-6 rounded-full border border-neutral-200"
            style={{ background: draftPreview.accentColor.value ?? "transparent" }}
            title="Color de acento"
          />
        </div>
        <p className="mt-3 text-sm text-neutral-700">
          {draftPreview.homepageMessage.value ??
            "Sin mensaje personalizado — se usa el mensaje automático de bienvenida."}
        </p>
      </Card>
    </div>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  help,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
      />
      {help ? <p className="mt-1.5 text-xs text-neutral-400">{help}</p> : null}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  help,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </label>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-900 outline-none transition focus:border-neutral-400"
      />
      {help ? <p className="mt-1.5 text-xs text-neutral-400">{help}</p> : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  derivedHex,
  onChange,
}: {
  label: string;
  value: string | null;
  derivedHex: string | null;
  onChange: (value: string | null) => void;
}) {
  const swatch = value ?? derivedHex ?? "#e5e5e5";
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(swatch) ? swatch : "#e5e5e5"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 bg-white p-0.5"
          aria-label={label}
        />
        <input
          type="text"
          value={value ?? ""}
          placeholder={derivedHex ?? "#000000"}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
        />
      </div>
      {derivedHex && !value ? (
        <p className="mt-1.5 text-xs text-neutral-400">
          Sugerido por el motor de marca: {derivedHex}
        </p>
      ) : null}
    </div>
  );
}

function TerminologyRow({
  term,
  derivedLabel,
  context,
  value,
  onChange,
}: {
  term: string;
  derivedLabel: string;
  context: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-100 bg-stone-50/60 px-4 py-3">
      <div className="min-w-[160px] flex-1">
        <p className="text-sm text-neutral-800">{derivedLabel}</p>
        <p className="text-xs text-neutral-400">
          {term} · {context}
        </p>
      </div>
      <input
        type="text"
        value={value}
        placeholder={derivedLabel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[220px] rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
      />
    </div>
  );
}
