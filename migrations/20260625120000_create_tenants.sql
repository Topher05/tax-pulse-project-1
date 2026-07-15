-- Deprecated: legacy hand-written migration kept for reference only.
-- Current migrations live in `src/typescript/db/drizzle-migrations/`.
DROP TABLE IF EXISTS stage_transition;

DROP TABLE IF EXISTS tax_plan_cycle;

DROP TABLE IF EXISTS tenants;

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
