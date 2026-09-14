-- Product master. Additive CREATE only.
-- Does not ALTER existing tables. Does not insert preview rows.
-- This is not a price list and not an import.
-- business_code stays nullable. Do not invent a commercial code.
-- Deactivate updates active. It does not delete the row or its citations.
-- Identity (organization_id, id) is immutable.

CREATE TABLE os_catalog_products (
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  id TEXT NOT NULL,
  business_code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  canonical_key TEXT NOT NULL,
  review_status TEXT NOT NULL,
  review_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id),
  CONSTRAINT os_catalog_products_id_chk
    CHECK (length(btrim(id)) > 0),
  CONSTRAINT os_catalog_products_name_chk
    CHECK (length(btrim(name)) > 0),
  CONSTRAINT os_catalog_products_canonical_chk
    CHECK (length(btrim(canonical_key)) > 0),
  CONSTRAINT os_catalog_products_business_code_chk
    CHECK (business_code IS NULL OR length(btrim(business_code)) > 0),
  CONSTRAINT os_catalog_products_category_chk
    CHECK (category IN ('sanitarios', 'tanques', 'lavamanos', 'urinarios')),
  CONSTRAINT os_catalog_products_review_status_chk
    CHECK (
      review_status IN (
        'spec_page',
        'dimensions_unspecified',
        'named_only',
        'comparison_row_only'
      )
    ),
  CONSTRAINT os_catalog_products_active_deactivated_chk
    CHECK (
      (active = TRUE AND deactivated_at IS NULL)
      OR (active = FALSE AND deactivated_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX os_catalog_products_org_canonical_uidx
  ON os_catalog_products (organization_id, canonical_key);

CREATE UNIQUE INDEX os_catalog_products_org_business_code_uidx
  ON os_catalog_products (organization_id, business_code)
  WHERE business_code IS NOT NULL;

CREATE INDEX os_catalog_products_org_active_idx
  ON os_catalog_products (organization_id, active);

CREATE TABLE os_catalog_product_provenance (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  page INTEGER NOT NULL,
  printed_label TEXT,
  role TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  CONSTRAINT os_catalog_product_provenance_product_fk
    FOREIGN KEY (organization_id, product_id)
    REFERENCES os_catalog_products (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_catalog_product_provenance_file_chk
    CHECK (length(btrim(source_filename)) > 0),
  CONSTRAINT os_catalog_product_provenance_sha_chk
    CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT os_catalog_product_provenance_page_chk
    CHECK (page > 0),
  CONSTRAINT os_catalog_product_provenance_excerpt_chk
    CHECK (length(btrim(excerpt)) > 0),
  CONSTRAINT os_catalog_product_provenance_role_chk
    CHECK (
      role IN (
        'specification',
        'comparison_table',
        'marketing',
        'index',
        'composition',
        'lifestyle'
      )
    )
);

CREATE INDEX os_catalog_product_provenance_product_idx
  ON os_catalog_product_provenance (organization_id, product_id);

CREATE TABLE os_catalog_product_attributes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  column_label TEXT,
  source_filename TEXT NOT NULL,
  page INTEGER NOT NULL,
  CONSTRAINT os_catalog_product_attributes_product_fk
    FOREIGN KEY (organization_id, product_id)
    REFERENCES os_catalog_products (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_catalog_product_attributes_value_chk
    CHECK (length(btrim(attribute_value)) > 0),
  CONSTRAINT os_catalog_product_attributes_page_chk
    CHECK (page > 0),
  CONSTRAINT os_catalog_product_attributes_key_chk
    CHECK (
      attribute_key IN (
        'dimensiones',
        'alto',
        'ancho',
        'profundidad',
        'largo',
        'sistemaDescarga',
        'pesoAproximado',
        'pesoLavamanos',
        'pesoPedestal',
        'espejoDeAgua',
        'instalacion',
        'metodoDescarga',
        'metodoInstalacion',
        'distanciaDesaguePared',
        'colores',
        'compatibilidadConTanques',
        'compatibilidadConSanitarios',
        'capacidadDescarga',
        'material',
        'espesor',
        'color',
        'rebalse',
        'calidad',
        'composicionImpresa'
      )
    )
);

CREATE INDEX os_catalog_product_attributes_product_idx
  ON os_catalog_product_attributes (organization_id, product_id);

CREATE TABLE os_catalog_product_status_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT os_catalog_product_status_events_product_fk
    FOREIGN KEY (organization_id, product_id)
    REFERENCES os_catalog_products (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_catalog_product_status_events_reason_chk
    CHECK (reason IN ('registered', 'deactivated'))
);

CREATE INDEX os_catalog_product_status_events_product_idx
  ON os_catalog_product_status_events (organization_id, product_id, recorded_at);

-- Deactivate is an update. A delete would drop citations and status history.
CREATE OR REPLACE FUNCTION os_catalog_reject_product_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'os_catalog_products are not deleted; deactivate keeps history';
END;
$$;

CREATE TRIGGER os_catalog_products_no_delete
  BEFORE DELETE ON os_catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION os_catalog_reject_product_delete();

CREATE OR REPLACE FUNCTION os_catalog_reject_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.canonical_key IS DISTINCT FROM OLD.canonical_key THEN
    RAISE EXCEPTION 'os_catalog product identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER os_catalog_products_immutable_identity
  BEFORE UPDATE ON os_catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION os_catalog_reject_identity_change();
