-- Additive: shared fixed-window request counters (V2 §18.1). No existing table changes.
CREATE TABLE "os_rate_limit_buckets" (
    "organization_id" TEXT NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_rate_limit_buckets_pkey" PRIMARY KEY ("organization_id","bucket_key","window_start")
);

CREATE INDEX "os_rate_limit_buckets_window_idx" ON "os_rate_limit_buckets"("window_start");
