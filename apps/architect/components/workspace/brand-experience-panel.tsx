"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import {
  BRAND_ASSET_UPLOAD_PROVIDERS,
  BRAND_FUTURE_OUTPUTS,
} from "@/lib/brand";
import {
  recommendationStrength,
  strengthBand,
  strengthHint,
} from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import type {
  AccessibilityProfile,
  BrandExperienceModel,
  BrandRecommendation,
  DesignTokens,
  NavigationPreference,
  TerminologyEntry,
} from "@/types";

export function BrandExperiencePanel({
  model,
}: {
  model: BrandExperienceModel | null | undefined;
}) {
  if (!model) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-600">
          La guía de marca y experiencia aparece una vez que el plan de
          negocio está listo. Captura cómo la empresa quiere verse, sentirse
          y vivirse en el software — inferido del diagnóstico, nunca
          inventado.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Marca y experiencia
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Dirección de identidad y experiencia
        </h3>
        <p className="mt-3 text-neutral-600">{model.summary}</p>
        <p className="mt-4 text-sm text-neutral-400">
          {recommendationStrength(model.overallConfidence)} ·{" "}
          {formatRelativeActivity(model.generatedAt)} · solo lectura
        </p>
      </Card>

      <Block title="Resumen ejecutivo">
        <p className="text-neutral-800">{model.executiveSummary}</p>
      </Block>

      <Block title="Perfil de marca">
        <Meta label="Nombre de exhibición" value={model.brandProfile.companyDisplayName} />
        <RecField label="Lema" rec={model.brandProfile.tagline} />
        <RecField label="Voz y tono" rec={model.brandProfile.voiceTone} />
        <RecList label="Personalidad" rec={model.brandProfile.personalityTraits} />
        <RecField label="Posicionamiento de industria" rec={model.brandProfile.industryPositioning} />
        <RecField label="Diferenciación" rec={model.brandProfile.differentiation} />
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Logotipos
          </p>
          <ul className="mt-2 space-y-2">
            {model.brandProfile.logos.map((logo) => (
              <li key={logo.kind} className="text-sm text-neutral-700">
                {logo.kind} · {logo.status}
                {logo.notes ? (
                  <span className="text-neutral-400"> — {logo.notes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block title="Perfil de experiencia">
        <RecField
          label="Visión de experiencia del empleado"
          rec={model.experienceProfile.employeeExperienceVision}
        />
        <RecList
          label="Expectativas de software"
          rec={model.experienceProfile.softwareExpectations}
        />
        <RecField
          label="Estilo de incorporación"
          rec={model.experienceProfile.onboardingStyle}
        />
        <RecField
          label="Preferencia de densidad"
          rec={model.experienceProfile.densityPreference}
        />
        <RegionalFormats model={model} />
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Preferencias de notificación
          </p>
          <ul className="mt-2 space-y-1.5">
            {model.experienceProfile.notificationPreferences.map((pref) => (
              <li key={pref.channel} className="text-sm text-neutral-700">
                {pref.channel}:{" "}
                {pref.enabled == null
                  ? "sin definir"
                  : pref.enabled
                    ? "activado"
                    : "desactivado"}
                <span className="text-neutral-400">
                  {" "}
                  · {strengthBand(pref.confidence)} — {pref.reasoning}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block title="Recomendación de tema">
        <Meta label="Tema" value={model.themeRecommendation.name} />
        <Meta label="Modo" value={model.themeRecommendation.mode} />
        <p className="mt-2 text-sm text-neutral-600">
          {model.themeRecommendation.rationale}
        </p>
        <RecField label="Estética" rec={model.themeRecommendation.aesthetic} />
        <Confidence
          value={model.themeRecommendation.confidence}
          reasoning={model.themeRecommendation.rationale}
        />
      </Block>

      <Block title="Tokens de diseño">
        <DesignTokensView tokens={model.designTokens} />
      </Block>

      <Block title="Terminología">
        <RecField label="Idioma predeterminado" rec={model.terminology.localeDefault} />
        <RecField label="Formalidad" rec={model.terminology.formality} />
        {model.terminology.entries.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            Aún no hay mapeos de terminología — las entidades y departamentos
            del plan de negocio irán completando esta sección.
          </p>
        ) : (
          <TerminologyTable entries={model.terminology.entries} />
        )}
      </Block>

      <Block title="Recomendaciones de navegación">
        {model.navigation.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Los patrones de navegación requieren capacidades de software o
            departamentos del plan de negocio.
          </p>
        ) : (
          <NavigationList items={model.navigation} />
        )}
      </Block>

      <Block title="Accesibilidad">
        <AccessibilityView profile={model.accessibility} />
      </Block>

      <ExecutiveDetail
        labelExpand="Ver justificación y fuentes"
        labelCollapse="Ocultar justificación y fuentes"
        summary={
          <p className="text-sm text-neutral-600">
            {recommendationStrength(model.overallConfidence)}.{" "}
            {strengthHint(model.overallConfidence)}.
          </p>
        }
      >
        <ul className="space-y-2">
          {model.reasoning.map((line) => (
            <li key={line} className="text-sm text-neutral-700">
              {line}
            </li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2">
          {model.evidence.map((ref) => (
            <li
              key={`${ref.source}-${ref.id}`}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500"
            >
              {ref.label}
            </li>
          ))}
        </ul>
      </ExecutiveDetail>

      <Block title="Futuros activos de marca">
        <p className="mb-3 text-sm text-neutral-500">
          Canales de recepción de activos — pensados para una versión
          posterior.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {BRAND_ASSET_UPLOAD_PROVIDERS.map((provider) => (
            <li
              key={provider.id}
              className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-neutral-900">{provider.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {provider.description}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                {provider.status}
              </p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Futuros entregables de experiencia">
        <ul className="grid gap-2 sm:grid-cols-2">
          {BRAND_FUTURE_OUTPUTS.map((output) => (
            <li
              key={output.id}
              className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-neutral-900">{output.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{output.description}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                {output.status}
              </p>
            </li>
          ))}
        </ul>
      </Block>

      <ExecutiveDetail
        labelExpand="Ver preparación para marca blanca"
        labelCollapse="Ocultar preparación para marca blanca"
        summary={
          <p className="text-sm text-neutral-600">
            Preparación de marca de socio para un despliegue futuro — detalle
            opcional.
          </p>
        }
      >
        <Meta label="Estado" value={model.whiteLabel.status} />
        <RecField label="Dominio personalizado" rec={model.whiteLabel.customDomain} />
        <RecField
          label="Ocultar marca ISALWA"
          rec={model.whiteLabel.hideIsalwaBranding}
        />
        <RecField label="Nombre del socio" rec={model.whiteLabel.partnerName} />
      </ExecutiveDetail>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        {title}
      </h4>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-neutral-700">
      <span className="text-neutral-400">{label}:</span> {value}
    </p>
  );
}

function RecField<T>({
  label,
  rec,
}: {
  label: string;
  rec: BrandRecommendation<T>;
}) {
  const display =
    rec.value == null
      ? "—"
      : typeof rec.value === "boolean"
        ? rec.value
          ? "sí"
          : "no"
        : String(rec.value);

  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-neutral-800">{display}</p>
      {rec.confidence > 0 ? (
        <p className="mt-1 text-xs text-neutral-400">
          {strengthBand(rec.confidence)} — {rec.reasoning}
        </p>
      ) : (
        <p className="mt-1 text-xs text-neutral-400">{rec.reasoning}</p>
      )}
    </div>
  );
}

function RecList<T>({
  label,
  rec,
}: {
  label: string;
  rec: BrandRecommendation<T>;
}) {
  const items = Array.isArray(rec.value) ? rec.value : [];
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-500">{rec.reasoning}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {(items as string[]).map((item) => (
            <li key={item} className="text-sm text-neutral-700">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Confidence({
  value,
  reasoning,
}: {
  value: number;
  reasoning?: string;
}) {
  return (
    <p className="text-sm text-neutral-700">
      {recommendationStrength(value)}
      {reasoning ? (
        <span className="text-neutral-400"> — {reasoning}</span>
      ) : null}
    </p>
  );
}

function DesignTokensView({ tokens }: { tokens: DesignTokens }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
          Colores
        </p>
        <ul className="mt-2 space-y-2">
          {tokens.colors.map((color) => (
            <li key={color.name} className="flex items-center gap-3 text-sm">
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-neutral-200"
                style={{
                  background: color.hex ?? "transparent",
                }}
              />
              <span className="text-neutral-800">
                {color.role}: {color.name}{" "}
                {color.hex ? `(${color.hex})` : "(sin definir)"}
              </span>
              <span className="text-neutral-400">
                {strengthBand(color.confidence)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
          Tipografía
        </p>
        <ul className="mt-2 space-y-1.5">
          {tokens.typography.map((t) => (
            <li key={t.role} className="text-sm text-neutral-700">
              {t.role}: {t.family ?? "—"} {t.weight ?? ""}
            </li>
          ))}
        </ul>
      </div>
      <RecField label="Radio de bordes" rec={tokens.borderRadius} />
      <RecField label="Elevación" rec={tokens.elevation} />
    </div>
  );
}

function TerminologyTable({ entries }: { entries: TerminologyEntry[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm text-neutral-700">
          <span className="text-neutral-950">{entry.preferredLabel}</span>
          <span className="text-neutral-400"> · {entry.term}</span>
          <span className="text-neutral-400"> — {entry.context}</span>
        </li>
      ))}
    </ul>
  );
}

function NavigationList({ items }: { items: NavigationPreference[] }) {
  return (
    <ul className="space-y-4">
      {items.map((nav) => (
        <li key={nav.id}>
          <p className="text-neutral-950">{nav.label}</p>
          <p className="mt-1 text-sm text-neutral-500">{nav.rationale}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {nav.pattern} · {strengthBand(nav.confidence)}
            {nav.modules.length > 0
              ? ` · Capacidades: ${nav.modules.join(" · ")}`
              : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function AccessibilityView({ profile }: { profile: AccessibilityProfile }) {
  return (
    <div>
      <RecField label="Meta de contraste" rec={profile.contrastTarget} />
      <RecField label="Movimiento" rec={profile.motionPreference} />
      <RecField label="Escala de fuente" rec={profile.fontScaleDefault} />
      <RecField label="Prioridad de teclado" rec={profile.keyboardFirst} />
      {profile.notes.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {profile.notes.map((note) => (
            <li key={note} className="text-sm text-neutral-600">
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RegionalFormats({ model }: { model: BrandExperienceModel }) {
  const r = model.experienceProfile.regionalFormats;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <RecField label="Idioma" rec={r.language} />
      <RecField label="Zona horaria" rec={r.timezone} />
      <RecField label="Formato de fecha" rec={r.dateFormat} />
      <RecField label="Moneda" rec={r.currency} />
    </div>
  );
}
