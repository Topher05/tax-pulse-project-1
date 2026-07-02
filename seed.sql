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
