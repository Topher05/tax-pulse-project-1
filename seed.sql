-- Shared synthetic seed for npm run seed and the Testcontainers integration suite.
INSERT INTO tenants (id, name, created_at) VALUES
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01',
    'North Shore Advisors',
    '2026-06-29T12:00:00Z'
  ),
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02',
    'Harbor View Planning',
    '2026-06-29T12:30:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO tax_plan_cycle (
  client_id,
  tenant_id,
  planning_period,
  stage,
  owner,
  priority,
  due_date,
  on_hold,
  hold_reason
) VALUES
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11',
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01',
    '2026-Q3',
    'Review',
    'advisor-001',
    'high',
    '2026-07-15',
    FALSE,
    NULL
  ),
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12',
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02',
    '2026-Q4',
    'Intake',
    'advisor-002',
    'medium',
    '2026-08-15',
    TRUE,
    'Awaiting client documents'
  )
ON CONFLICT (client_id) DO NOTHING;
