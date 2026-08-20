BEGIN;

INSERT INTO scenario (
  case_id,
  name,
  typed_figures,
  computed_result
)
VALUES
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f62',
    'Increase retirement contributions',
    '{
      "income": 250000,
      "deductions": 30000,
      "state": "CA",
      "filing_status": "married_filing_jointly"
    }'::jsonb,
    '{
      "federal_liability": 45000,
      "state_liability": 18000,
      "effective_rate": 0.252,
      "marginal_rate": 0.32,
      "quarterly_estimate": 15750,
      "total_tax": 63000,
      "delta_vs_baseline": -4500
    }'::jsonb
  ),
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f62',
    'Add HSA contributions',
    '{
      "income": 250000,
      "deductions": 34500,
      "state": "CA",
      "filing_status": "married_filing_jointly"
    }'::jsonb,
    '{
      "federal_liability": 43800,
      "state_liability": 17625,
      "effective_rate": 0.246,
      "marginal_rate": 0.32,
      "quarterly_estimate": 15356.25,
      "total_tax": 61425,
      "delta_vs_baseline": -6075
    }'::jsonb
  ),
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f62',
    'Defer bonus income',
    '{
      "income": 235000,
      "deductions": 30000,
      "state": "CA",
      "filing_status": "married_filing_jointly"
    }'::jsonb,
    '{
      "federal_liability": 40250,
      "state_liability": 17040,
      "effective_rate": 0.244,
      "marginal_rate": 0.24,
      "quarterly_estimate": 15072.5,
      "total_tax": 57290,
      "delta_vs_baseline": -12110
    }'::jsonb
  ),
  (
    '018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f62',
    'Harvest capital losses',
    '{
      "income": 250000,
      "deductions": 32000,
      "state": "CA",
      "filing_status": "married_filing_jointly"
    }'::jsonb,
    '{
      "federal_liability": 44400,
      "state_liability": 17720,
      "effective_rate": 0.249,
      "marginal_rate": 0.32,
      "quarterly_estimate": 15530,
      "total_tax": 62120,
      "delta_vs_baseline": -5300
    }'::jsonb
  )
ON CONFLICT (case_id, name) DO NOTHING;

COMMIT;
