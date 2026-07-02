CREATE TABLE IF NOT EXISTS tax_plan_cycle (
  client_id UUID CONSTRAINT tax_plan_cycle_client_id_pk PRIMARY KEY DEFAULT uuidv7(),
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
