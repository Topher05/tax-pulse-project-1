-- Deduction injection script, add test records for deduction table clients b & c client A is part of briana's user script
WITH vars AS (
  SELECT
    '018d6c1g-3f9b-7c28-8d1a-0f4a3b8c9d12'::uuid AS client_a,
    '019fbdbe-1935-71c0-836a-91f578c771ec'::uuid AS client_b,
    '019fbdbf-1935-7a10-b983-ce7aa19a2915'::uuid AS client_c
)
SELECT d.*
FROM "deduction" d
CROSS JOIN vars
WHERE d."case_id" = vars.client_a -- Adjust to a,b,c for first, second and third in line to compare data
ORDER BY d."date" DESC;

vars.client_a

BEGIN;

INSERT INTO "deduction" (
  "case_id",
  "date",
  "description",
  "category",
  "amount",
  "tax_impact",
  "deleted"
)
VALUES
  ('019fbdb6-1935-71c0-836a-91f578c771ec'::uuid, '2026-07-30', 'Business development travel and meals', 'Business Expense', 780.00, 195.00, false),
  ('019fbdb6-1935-71c0-836a-91f578c771ec'::uuid, '2026-07-29', 'Home office internet allocation', 'Home Office', 120.00, 30.00, false),
  ('019fbdb6-1935-71c0-836a-91f578c771ec'::uuid, '2026-07-28', 'Charitable cash contribution', 'Charitable Giving', 500.00, 125.00, false),
  ('019fbdb6-1935-71c0-836a-91f578c771ec'::uuid, '2026-07-27', 'Annual physical and labs', 'Health & Medical', 310.00, 77.50, false),
  ('019fbdb6-1935-71c0-836a-91f578c771ec'::uuid, '2026-07-26', 'Course fees for continuing education', 'Education', 950.00, 237.50, false),
  ('019fbdb6-1935-7a10-b983-ce7aa19a2915'::uuid, '2026-07-25', 'Retirement plan contribution', 'Retirement Contribution', 6000.00, 1500.00, false),
  ('019fbdb6-1935-7a10-b983-ce7aa19a2915'::uuid, '2026-07-24', 'Miscellaneous deductible expense', 'Other', 215.00, 53.75, false);

COMMIT;