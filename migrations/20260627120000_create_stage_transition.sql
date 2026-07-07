CREATE TABLE IF NOT EXISTS stage_transition (
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

CREATE INDEX IF NOT EXISTS stage_transition_case_id_idx
  ON stage_transition (case_id);
