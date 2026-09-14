-- Purchase request status workflow. Does not rewrite 20260915180000_os_purchase_request.
-- Staging has not applied that migration. This file still maps existing keys forward
-- so a database that already has the old check can adopt Isa's stored ids.
-- requested -> solicitado
-- in_progress -> cotizandose
-- received -> entregado
-- cancelled stays cancelled as a stop, not a happy-path step.
-- New stored ids: solicitado, cotizandose, pedido_preparandose, entregado, cancelled.
-- Spanish labels are not stored. This file does not claim stock, reorder, or a supplier party.

-- Drop the old checks before rewriting values. The previous check rejects the new ids.
ALTER TABLE os_purchase_requests
  DROP CONSTRAINT os_purchase_requests_status_chk;

ALTER TABLE os_purchase_request_status_history
  DROP CONSTRAINT os_purchase_request_status_history_status_chk;

ALTER TABLE os_purchase_request_status_history
  DROP CONSTRAINT os_purchase_request_status_history_open_chk;

UPDATE os_purchase_requests
SET status = CASE status
  WHEN 'requested' THEN 'solicitado'
  WHEN 'in_progress' THEN 'cotizandose'
  WHEN 'received' THEN 'entregado'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE status
END
WHERE status IN ('requested', 'in_progress', 'received', 'cancelled');

UPDATE os_purchase_request_status_history
SET from_status = CASE from_status
  WHEN 'requested' THEN 'solicitado'
  WHEN 'in_progress' THEN 'cotizandose'
  WHEN 'received' THEN 'entregado'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE from_status
END
WHERE from_status IN ('requested', 'in_progress', 'received', 'cancelled');

UPDATE os_purchase_request_status_history
SET to_status = CASE to_status
  WHEN 'requested' THEN 'solicitado'
  WHEN 'in_progress' THEN 'cotizandose'
  WHEN 'received' THEN 'entregado'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE to_status
END
WHERE to_status IN ('requested', 'in_progress', 'received', 'cancelled');

ALTER TABLE os_purchase_requests
  ALTER COLUMN status SET DEFAULT 'solicitado';

ALTER TABLE os_purchase_requests
  ADD CONSTRAINT os_purchase_requests_status_chk
  CHECK (status IN ('solicitado', 'cotizandose', 'pedido_preparandose', 'entregado', 'cancelled'));

ALTER TABLE os_purchase_request_status_history
  ADD CONSTRAINT os_purchase_request_status_history_status_chk
  CHECK (
    to_status IN ('solicitado', 'cotizandose', 'pedido_preparandose', 'entregado', 'cancelled')
    AND (
      from_status IS NULL
      OR from_status IN ('solicitado', 'cotizandose', 'pedido_preparandose', 'entregado', 'cancelled')
    )
    AND (from_status IS NULL OR from_status <> to_status)
  );

-- A new request opens as solicitado. cancelled stays a stop and cannot open a row.
ALTER TABLE os_purchase_request_status_history
  ADD CONSTRAINT os_purchase_request_status_history_open_chk
  CHECK (from_status IS NOT NULL OR to_status = 'solicitado');
