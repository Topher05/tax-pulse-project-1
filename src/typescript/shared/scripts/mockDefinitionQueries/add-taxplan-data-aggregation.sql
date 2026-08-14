BEGIN;

-- Insert a synthetic tax plan cycle for the requested client.
-- The tenant is derived from the existing user row so the script stays scoped correctly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62'
  ) THEN
    RAISE EXCEPTION 'User % was not found', '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62';
  END IF;
END $$;

WITH target_user AS (
  SELECT id, tenant_id
  FROM users
  WHERE id = '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62'
)
INSERT INTO tax_plan_cycle (
  id,
  client_id,
  tenant_id,
  planning_period,
  stage,
  owner,
  priority,
  due_date,
  on_hold,
  hold_reason
)
SELECT
  '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f62',
  target_user.id,
  target_user.tenant_id,
  '2027-Q4',
  'Data Aggregation',
  'advisor-002',
  'medium',
  DATE '2026-10-15',
  false,
  NULL
FROM target_user
ON CONFLICT (id) DO NOTHING;

COMMIT;
