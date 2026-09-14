-- Versioned price list. Additive CREATE only.
-- Does not ALTER the product master and does not add Product.price.
-- Does not insert rows. An unsourced amount is not a price entry.
-- Quoted price stays on the quote line and is not copied here.
-- Identity and amount are immutable; a new version is a new row.

CREATE TABLE os_price_lists (
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  id TEXT NOT NULL,
  version TEXT NOT NULL,
  currency TEXT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  source_filename TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  source_page INTEGER,
  source_excerpt TEXT NOT NULL,
  printed_context TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id),
  CONSTRAINT os_price_lists_currency_chk
    CHECK (currency = 'BOB'),
  CONSTRAINT os_price_lists_id_chk
    CHECK (length(btrim(id)) > 0),
  CONSTRAINT os_price_lists_version_chk
    CHECK (length(btrim(version)) > 0),
  CONSTRAINT os_price_lists_source_file_chk
    CHECK (length(btrim(source_filename)) > 0),
  CONSTRAINT os_price_lists_source_sha_chk
    CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT os_price_lists_source_excerpt_chk
    CHECK (length(btrim(source_excerpt)) > 0),
  CONSTRAINT os_price_lists_source_page_chk
    CHECK (source_page IS NULL OR source_page > 0),
  CONSTRAINT os_price_lists_effective_chk
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX os_price_lists_org_version_uidx
  ON os_price_lists (organization_id, version);

CREATE INDEX os_price_lists_org_effective_idx
  ON os_price_lists (organization_id, effective_from);

CREATE TABLE os_price_entries (
  organization_id TEXT NOT NULL REFERENCES os_organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  id TEXT NOT NULL,
  price_list_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  context TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_centavos BIGINT NOT NULL,
  source_filename TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  source_page INTEGER,
  source_excerpt TEXT NOT NULL,
  printed_context TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id),
  CONSTRAINT os_price_entries_list_fk
    FOREIGN KEY (organization_id, price_list_id)
    REFERENCES os_price_lists (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_price_entries_product_fk
    FOREIGN KEY (organization_id, product_id)
    REFERENCES os_catalog_products (organization_id, id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT os_price_entries_currency_chk
    CHECK (currency = 'BOB'),
  CONSTRAINT os_price_entries_amount_chk
    CHECK (amount_centavos > 0),
  CONSTRAINT os_price_entries_context_chk
    CHECK (
      context IN (
        'Showroom',
        'Más de 10 unidades',
        'Calidad Segunda',
        'Viajes'
      )
    ),
  CONSTRAINT os_price_entries_source_file_chk
    CHECK (length(btrim(source_filename)) > 0),
  CONSTRAINT os_price_entries_source_sha_chk
    CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT os_price_entries_source_excerpt_chk
    CHECK (length(btrim(source_excerpt)) > 0),
  CONSTRAINT os_price_entries_source_page_chk
    CHECK (source_page IS NULL OR source_page > 0)
);

CREATE UNIQUE INDEX os_price_entries_list_product_context_uidx
  ON os_price_entries (organization_id, price_list_id, product_id, context);

CREATE INDEX os_price_entries_product_idx
  ON os_price_entries (organization_id, product_id);

CREATE OR REPLACE FUNCTION os_price_reject_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'price lists and entries are not deleted; add a new version';
END;
$$;

CREATE TRIGGER os_price_lists_no_delete
  BEFORE DELETE ON os_price_lists
  FOR EACH ROW
  EXECUTE FUNCTION os_price_reject_delete();

CREATE TRIGGER os_price_entries_no_delete
  BEFORE DELETE ON os_price_entries
  FOR EACH ROW
  EXECUTE FUNCTION os_price_reject_delete();

CREATE OR REPLACE FUNCTION os_price_reject_identity_or_amount_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'os_price_lists' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'price list identity is immutable';
    END IF;
  ELSIF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.price_list_id IS DISTINCT FROM OLD.price_list_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.context IS DISTINCT FROM OLD.context
     OR NEW.amount_centavos IS DISTINCT FROM OLD.amount_centavos
     OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'price entry identity and amount are immutable; add a new version';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER os_price_lists_immutable_identity
  BEFORE UPDATE ON os_price_lists
  FOR EACH ROW
  EXECUTE FUNCTION os_price_reject_identity_or_amount_change();

CREATE TRIGGER os_price_entries_immutable_amount
  BEFORE UPDATE ON os_price_entries
  FOR EACH ROW
  EXECUTE FUNCTION os_price_reject_identity_or_amount_change();
