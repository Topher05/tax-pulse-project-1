CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY
);

CREATE TABLE tax_plan_cycle (
  client_id TEXT CONSTRAINT tax_plan_cycle_client_id_pk PRIMARY KEY,
  case_id TEXT NOT NULL CONSTRAINT tax_plan_cycle_case_id_key UNIQUE, --Case_id here was originally planned to be a foreign key and still can be, this is just temporary wiring until later ticket changes it
  tenant_id TEXT NOT NULL CONSTRAINT tax_plan_cycle_tenant_id_fk REFERENCES tenants (id),
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

CREATE INDEX tax_plan_cycle_tenant_id_due_date_idx
  ON tax_plan_cycle (tenant_id, due_date);

CREATE TABLE stage_transition (
  case_id TEXT NOT NULL CONSTRAINT stage_transition_case_id_fk REFERENCES tax_plan_cycle (case_id), --This line was originally 'client_id' but changed to case_id since it is referencing the same variable in tax_plan_cycle and has been changed temporarily to avoid mismatch. Can be changed later
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
