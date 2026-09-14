-- Gate C read-only evidence package
-- Staging labels (identity only): isalwa-os-staging / dpg-dajd3kh5efls738falcg-a / isalwa_os_staging
-- Gate C: HOLD / BLOCKED_DB_STATE_UNKNOWN
-- DO NOT RUN until Carmen authorizes DB access.
-- DO NOT include names, emails, phones, addresses, or document free text.
-- Safe: counts, existence, constraints, migration history, status enums.

-- 1) Database identity
SELECT current_database() AS database_name,
       current_user AS db_user,
       inet_server_addr() AS server_addr,
       inet_server_port() AS server_port,
       version() AS pg_version;

-- 2) Prisma migration history (no secrets)
SELECT migration_name,
       finished_at,
       applied_steps_count,
       rolled_back_at,
       started_at
FROM "_prisma_migrations"
ORDER BY started_at NULLS LAST, migration_name;

-- 3) Relevant table existence
SELECT c.relname AS table_name,
       n.nspname AS schema_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
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
  )
ORDER BY c.relname;

-- 4) Row counts (presence only)
SELECT 'os_production_trace_entries' AS table_name, COUNT(*)::bigint AS row_count FROM os_production_trace_entries
UNION ALL SELECT 'os_production_quemas', COUNT(*) FROM os_production_quemas
UNION ALL SELECT 'os_finished_goods_receipts', COUNT(*) FROM os_finished_goods_receipts
UNION ALL SELECT 'os_order_allocations', COUNT(*) FROM os_order_allocations
UNION ALL SELECT 'os_warehouse_exits', COUNT(*) FROM os_warehouse_exits
UNION ALL SELECT 'os_warehouse_outbound_notes', COUNT(*) FROM os_warehouse_outbound_notes
UNION ALL SELECT 'os_deliveries', COUNT(*) FROM os_deliveries
UNION ALL SELECT 'os_delivery_notes', COUNT(*) FROM os_delivery_notes
UNION ALL SELECT 'os_coordination_decisions', COUNT(*) FROM os_coordination_decisions
UNION ALL SELECT 'os_customer_coverage_grants', COUNT(*) FROM os_customer_coverage_grants
UNION ALL SELECT 'os_reported_operational_facts', COUNT(*) FROM os_reported_operational_facts
UNION ALL SELECT 'os_purchase_requests', COUNT(*) FROM os_purchase_requests
UNION ALL SELECT 'os_purchase_request_status_history', COUNT(*) FROM os_purchase_request_status_history
UNION ALL SELECT 'os_special_order_classifications', COUNT(*) FROM os_special_order_classifications
ORDER BY 1;

-- 5) Constraints on pilot tables
SELECT conrelid::regclass AS table_name,
       conname AS constraint_name,
       contype AS constraint_type
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'os_production_trace_entries',
  'os_finished_goods_receipts',
  'os_order_allocations',
  'os_warehouse_exits',
  'os_warehouse_outbound_notes',
  'os_deliveries',
  'os_delivery_notes',
  'os_coordination_decisions',
  'os_customer_coverage_grants',
  'os_purchase_requests',
  'os_purchase_request_status_history'
)
ORDER BY 1, 2;

-- 6) Indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'os_production_trace_entries',
    'os_finished_goods_receipts',
    'os_order_allocations',
    'os_warehouse_exits',
    'os_warehouse_outbound_notes',
    'os_deliveries',
    'os_customer_coverage_grants',
    'os_purchase_requests',
    'os_purchase_request_status_history'
  )
ORDER BY tablename, indexname;

-- 7) Foreign keys (names only)
SELECT conname AS fk_name,
       conrelid::regclass AS from_table,
       confrelid::regclass AS to_table
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN (
    'os_production_trace_entries',
    'os_finished_goods_receipts',
    'os_order_allocations',
    'os_warehouse_exits',
    'os_warehouse_outbound_notes',
    'os_deliveries',
    'os_delivery_notes',
    'os_customer_coverage_grants',
    'os_purchase_requests',
    'os_purchase_request_status_history'
  )
ORDER BY 2, 1;

-- 8) Purchase status distribution (no person/customer fields)
SELECT status, COUNT(*)::bigint AS row_count
FROM os_purchase_requests
GROUP BY status
ORDER BY status;

SELECT from_status, to_status, COUNT(*)::bigint AS row_count
FROM os_purchase_request_status_history
GROUP BY from_status, to_status
ORDER BY from_status, to_status;

-- 9) Critical baseline counts (orgs / members / orders — ids only)
SELECT 'os_organizations' AS table_name, COUNT(*)::bigint AS row_count FROM os_organizations
UNION ALL SELECT 'os_organization_members', COUNT(*) FROM os_organization_members
UNION ALL SELECT 'os_orders', COUNT(*) FROM os_orders
UNION ALL SELECT 'os_quotes', COUNT(*) FROM os_quotes
ORDER BY 1;
