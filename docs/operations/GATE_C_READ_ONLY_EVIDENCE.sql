-- Gate C read-only evidence package
-- Exact candidate under review: ef7eeabdea5f8f4449ba706caa1a323435d96fcc
-- Staging labels (identity only): isalwa-os-staging / dpg-dajd3kh5efls738falcg-a / isalwa_os_staging
-- Gate C: HOLD / BLOCKED_DB_STATE_UNKNOWN until this package returns live rows
-- RUN from an allow-listed operator environment only.
-- Do NOT alter IP allow list from this agent session.
-- Do NOT include names, emails, phones, addresses, or document free text.
-- Missing tables report NOT_PRESENT_PRE_MIGRATION (-1) instead of aborting.

-- ============================================================================
-- 1) Database identity
-- ============================================================================
SELECT current_database() AS database_name,
       current_user AS db_user,
       inet_server_addr() AS server_addr,
       inet_server_port() AS server_port,
       version() AS pg_version,
       NOW() AS observed_at;

-- ============================================================================
-- 2) Prisma migration history
-- ============================================================================
SELECT migration_name,
       finished_at,
       applied_steps_count,
       rolled_back_at,
       started_at
FROM "_prisma_migrations"
ORDER BY started_at NULLS LAST, migration_name;

-- ============================================================================
-- 3) Table presence + exact counts (safe for missing tables)
-- ============================================================================
DO $$
DECLARE
  t text;
  r bigint;
BEGIN
  CREATE TEMP TABLE gate_c_table_evidence (
    table_name text PRIMARY KEY,
    presence text NOT NULL,
    row_count bigint
  ) ON COMMIT PRESERVE ROWS;

  FOREACH t IN ARRAY ARRAY[
    'os_organizations',
    'os_organization_members',
    'os_parties',
    'os_party_contacts',
    'os_locations',
    'os_opportunities',
    'os_quotes',
    'os_orders',
    'os_order_lines',
    'os_production_quemas',
    'os_production_quema_times',
    'os_production_quema_products',
    'os_production_trace_entries',
    'os_finished_goods_receipts',
    'os_order_allocations',
    'os_warehouse_exits',
    'os_warehouse_outbound_notes',
    'os_warehouse_outbound_note_lines',
    'os_deliveries',
    'os_delivery_notes',
    'os_delivery_note_lines',
    'os_delivery_evidence',
    'os_coordination_decisions',
    'os_customer_coverage_grants',
    'os_reported_operational_facts',
    'os_purchase_requests',
    'os_purchase_request_status_history',
    'os_special_order_classifications'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      INSERT INTO gate_c_table_evidence VALUES (t, 'NOT_PRESENT_PRE_MIGRATION', NULL);
    ELSE
      EXECUTE format('SELECT COUNT(*)::bigint FROM %I', t) INTO r;
      INSERT INTO gate_c_table_evidence VALUES (t, 'PRESENT', r);
    END IF;
  END LOOP;
END $$;

SELECT * FROM gate_c_table_evidence ORDER BY table_name;

-- ============================================================================
-- 4) Constraints / indexes / FKs for PRESENT pilot tables
-- ============================================================================
SELECT c.conrelid::regclass::text AS table_name,
       c.conname AS constraint_name,
       c.contype AS constraint_type
FROM pg_constraint c
JOIN pg_class r ON r.oid = c.conrelid
JOIN pg_namespace n ON n.oid = r.relnamespace
WHERE n.nspname = 'public'
  AND r.relname IN (
    SELECT table_name FROM gate_c_table_evidence WHERE presence = 'PRESENT'
  )
ORDER BY 1, 2;

SELECT i.tablename, i.indexname
FROM pg_indexes i
WHERE i.schemaname = 'public'
  AND i.tablename IN (
    SELECT table_name FROM gate_c_table_evidence WHERE presence = 'PRESENT'
  )
ORDER BY i.tablename, i.indexname;

SELECT c.conname AS fk_name,
       c.conrelid::regclass::text AS from_table,
       c.confrelid::regclass::text AS to_table
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.conrelid::regclass::text IN (
    SELECT table_name FROM gate_c_table_evidence WHERE presence = 'PRESENT'
  )
ORDER BY 2, 1;

-- ============================================================================
-- 5) Purchase status evidence (only if PRESENT)
-- ============================================================================
DO $$
BEGIN
  CREATE TEMP TABLE gate_c_purchase_status (
    metric text NOT NULL,
    value text,
    row_count bigint NOT NULL
  ) ON COMMIT PRESERVE ROWS;

  IF to_regclass('public.os_purchase_requests') IS NULL THEN
    INSERT INTO gate_c_purchase_status VALUES ('os_purchase_requests', 'NOT_PRESENT_PRE_MIGRATION', 0);
  ELSE
    INSERT INTO gate_c_purchase_status
    SELECT 'status', status, COUNT(*)::bigint
    FROM os_purchase_requests
    GROUP BY status;

    INSERT INTO gate_c_purchase_status
    SELECT 'unmapped_status', status, COUNT(*)::bigint
    FROM os_purchase_requests
    WHERE status NOT IN (
      'requested', 'in_progress', 'received', 'cancelled',
      'solicitado', 'cotizandose', 'pedido_preparandose', 'entregado'
    )
    GROUP BY status;
  END IF;

  IF to_regclass('public.os_purchase_request_status_history') IS NULL THEN
    INSERT INTO gate_c_purchase_status VALUES ('os_purchase_request_status_history', 'NOT_PRESENT_PRE_MIGRATION', 0);
  ELSE
    INSERT INTO gate_c_purchase_status
    SELECT 'history',
           COALESCE(from_status, '<null>') || ' -> ' || to_status,
           COUNT(*)::bigint
    FROM os_purchase_request_status_history
    GROUP BY from_status, to_status;
  END IF;
END $$;

SELECT * FROM gate_c_purchase_status ORDER BY metric, value;

-- ============================================================================
-- 6) NULL counts for PRESENT tables only
-- ============================================================================
DO $$
BEGIN
  CREATE TEMP TABLE gate_c_null_counts (
    metric text PRIMARY KEY,
    null_count bigint,
    total bigint,
    note text
  ) ON COMMIT PRESERVE ROWS;

  IF to_regclass('public.os_orders') IS NOT NULL THEN
    INSERT INTO gate_c_null_counts
    SELECT 'os_orders.commercial_account_id',
           COUNT(*) FILTER (WHERE commercial_account_id IS NULL),
           COUNT(*),
           'null allowed'
    FROM os_orders;
  ELSE
    INSERT INTO gate_c_null_counts VALUES ('os_orders.commercial_account_id', NULL, NULL, 'NOT_PRESENT_PRE_MIGRATION');
  END IF;

  IF to_regclass('public.os_finished_goods_receipts') IS NOT NULL THEN
    INSERT INTO gate_c_null_counts
    SELECT 'os_finished_goods_receipts.product_id',
           COUNT(*) FILTER (WHERE product_id IS NULL),
           COUNT(*),
           'should be rare'
    FROM os_finished_goods_receipts;
  ELSE
    INSERT INTO gate_c_null_counts VALUES ('os_finished_goods_receipts.product_id', NULL, NULL, 'NOT_PRESENT_PRE_MIGRATION');
  END IF;

  IF to_regclass('public.os_order_allocations') IS NOT NULL THEN
    INSERT INTO gate_c_null_counts
    SELECT 'os_order_allocations.finished_goods_receipt_id',
           COUNT(*) FILTER (WHERE finished_goods_receipt_id IS NULL),
           COUNT(*),
           'citation optional'
    FROM os_order_allocations;
  ELSE
    INSERT INTO gate_c_null_counts VALUES ('os_order_allocations.finished_goods_receipt_id', NULL, NULL, 'NOT_PRESENT_PRE_MIGRATION');
  END IF;
END $$;

SELECT * FROM gate_c_null_counts ORDER BY metric;

-- ============================================================================
-- 7) Seven-customer integrity (counts only — never names/contacts)
-- ============================================================================
DO $$
BEGIN
  CREATE TEMP TABLE gate_c_customer_integrity (
    metric text PRIMARY KEY,
    value bigint,
    note text
  ) ON COMMIT PRESERVE ROWS;

  IF to_regclass('public.os_parties') IS NULL THEN
    INSERT INTO gate_c_customer_integrity VALUES ('party_count', NULL, 'NOT_PRESENT_PRE_MIGRATION');
  ELSE
    INSERT INTO gate_c_customer_integrity
    SELECT 'party_count', COUNT(*)::bigint, 'compare to known seven-customer import baseline; no display_name selected'
    FROM os_parties;
  END IF;

  IF to_regclass('public.os_locations') IS NULL THEN
    INSERT INTO gate_c_customer_integrity VALUES ('location_count', NULL, 'NOT_PRESENT_PRE_MIGRATION');
  ELSE
    INSERT INTO gate_c_customer_integrity
    SELECT 'location_count', COUNT(*)::bigint, 'counts only'
    FROM os_locations;
  END IF;
END $$;

SELECT * FROM gate_c_customer_integrity ORDER BY metric;
