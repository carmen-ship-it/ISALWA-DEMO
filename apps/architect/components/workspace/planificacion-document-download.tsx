"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getDocumentStorageProvider } from "@/lib/documents/storage";
import { useTranslations } from "@/lib/i18n";
import type { KnowledgeAsset } from "@/types";

export function PlanificacionDocumentDownload({
  asset,
}: {
  asset: KnowledgeAsset;
}) {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!asset.storagePath || loading) return;
    setLoading(true);
    try {
      const provider = getDocumentStorageProvider();
      const url = await provider.getDownloadUrl({
        provider: asset.storageProvider ?? provider.provider,
        bucket: asset.storageBucket ?? null,
        path: asset.storagePath,
      });
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  if (!asset.storagePath) return null;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-glaze-deep)] transition-colors hover:text-[var(--isalwa-kiln)] disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Download className="h-3 w-3" aria-hidden />
      )}
      {t("planificacion.download")}
    </button>
  );
}
