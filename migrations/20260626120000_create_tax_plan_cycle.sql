CREATE TABLE IF NOT EXISTS tax_plan_cycle (
  id UUID CONSTRAINT tax_plan_cycle_id_pk PRIMARY KEY DEFAULT uuidv7(),
  client_id UUID NOT NULL,
  tenant_id UUID NOT NULL CONSTRAINT tax_plan_cycle_tenant_id_fk REFERENCES tenants (id),
  planning_period TEXT NOT NULL,
  stage TEXT NOT NULL CONSTRAINT tax_plan_cycle_stage_check CHECK (
    stage IN (
      'Intake',
      'Data Aggregation',
      'Modeling',
      'Review',
      'Client Approval',
      'Executed',
      'Archived'
    )
  ),
  owner TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date DATE NOT NULL,
  on_hold BOOLEAN NOT NULL DEFAULT FALSE,
  hold_reason TEXT
);

CREATE INDEX IF NOT EXISTS tax_plan_cycle_tenant_id_due_date_idx
  ON tax_plan_cycle (tenant_id, due_date);

-- Note: Consider pulling transition migration into it's own file, easier readability
CREATE TABLE stage_transition (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL CONSTRAINT stage_transition_case_id_fk REFERENCES tax_plan_cycle (id),
  from_stage TEXT NOT NULL CONSTRAINT stage_transition_from_stage_check CHECK (
    from_stage IN (
      'Intake',
      'Data Aggregation',
      'Modeling',
      'Review',
      'Client Approval',
      'Executed',
      'Archived'
    )
  ),
  to_stage TEXT NOT NULL CONSTRAINT stage_transition_to_stage_check CHECK (
    to_stage IN (
      'Intake',
      'Data Aggregation',
      'Modeling',
      'Review',
      'Client Approval',
      'Executed',
      'Archived'
    )
  ),
  actor TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX stage_transition_case_id_idx
  ON stage_transition (case_id);
