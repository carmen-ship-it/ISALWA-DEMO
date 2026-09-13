-- Step 15.1 — Work / Approval / Attention projections (Lane F)

CREATE TABLE "os_work_read_models" (
    "work_item_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "owner_member_id" TEXT NOT NULL,
    "created_by_member_id" TEXT NOT NULL,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "pending_approval_id" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'none',
    "ownership_change_count" INTEGER NOT NULL DEFAULT 0,
    "last_ownership_change_at" TIMESTAMP(3),
    "last_reassigned_at" TIMESTAMP(3),
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_work_read_models_pkey" PRIMARY KEY ("work_item_id")
);

CREATE TABLE "os_approval_read_models" (
    "approval_request_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "work_item_id" TEXT,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "requested_by_member_id" TEXT NOT NULL,
    "approver_member_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "decision_by_member_id" TEXT,
    "decision_reason" TEXT,
    "decided_at" TIMESTAMP(3),
    "required_scope" TEXT,
    "last_event_id" TEXT,
    "last_occurred_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_approval_read_models_pkey" PRIMARY KEY ("approval_request_id")
);

CREATE TABLE "os_attention_read_models" (
    "attention_key" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "attention_type" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reason_detail_json" JSONB NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "work_item_id" TEXT,
    "approval_request_id" TEXT,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "derived_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "os_attention_read_models_pkey" PRIMARY KEY ("attention_key")
);

CREATE INDEX "os_work_read_models_organization_id_status_owner_member_id_idx" ON "os_work_read_models"("organization_id", "status", "owner_member_id");
CREATE INDEX "os_work_read_models_organization_id_owner_member_id_status_idx" ON "os_work_read_models"("organization_id", "owner_member_id", "status");
CREATE INDEX "os_approval_read_models_organization_id_status_approver_member_id_idx" ON "os_approval_read_models"("organization_id", "status", "approver_member_id");
CREATE INDEX "os_approval_read_models_organization_id_work_item_id_idx" ON "os_approval_read_models"("organization_id", "work_item_id");
CREATE INDEX "os_attention_read_models_organization_id_member_id_is_active_idx" ON "os_attention_read_models"("organization_id", "member_id", "is_active");

ALTER TABLE "os_work_read_models" ADD CONSTRAINT "os_work_read_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_approval_read_models" ADD CONSTRAINT "os_approval_read_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "os_attention_read_models" ADD CONSTRAINT "os_attention_read_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "os_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
