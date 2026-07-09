# ADR-0005: Use drizzle-seed for deterministic synthetic seed data

## Context
TaxPulse needs repeatable synthetic seed data for local development and integration
tests. The previous seed flow was a hand-written `seed.sql` file executed by a small
TypeScript wrapper.

That approach worked, but it had a few limitations:
- it duplicated seed intent in raw SQL instead of using the typed Drizzle schema,
- it made it harder to evolve seed data alongside schema changes,
- it did not naturally express seeded foreign-key relationships in code,
- it left us manually maintaining a SQL seed artifact even though the rest of the
  database workflow already uses Drizzle schema definitions.

We already use Drizzle ORM for the schema and repository layer, so bringing seed
generation into the same TypeScript surface keeps the database story more consistent.

## Decision
Install `drizzle-seed` and use it as the primary seed mechanism.

The seed implementation now lives in TypeScript alongside the schema and is driven from
the same Drizzle table definitions. The seed data remains deterministic and synthetic,
with explicit values for lookup tables and known foreign-key relationships for the
tenant, user, tax plan cycle, and stage transition records.

The existing `runSeed.ts` entrypoint remains only as a compatibility wrapper so older
references continue to work while the project moves to the new seed module.

## Consequences
This makes seed behavior:
- easier to keep aligned with the schema,
- easier to test and refactor with TypeScript,
- easier to extend when new tables or foreign-key relationships are added,
- more consistent with the rest of the Drizzle-based database workflow.

The tradeoffs are:
- the seed path now depends on TypeScript execution instead of a pure SQL file,
- seed logic becomes code that must be maintained and reviewed like other application
  code,
- raw SQL seed portability is reduced, since the canonical seed source is no longer a
  standalone SQL file.

We keep the seed data synthetic and deterministic so the repository integration tests
and local development remain reproducible.

## Alternatives considered
- Keep `seed.sql` as the primary seed source and continue executing it from the wrapper.
- Generate seed data manually in SQL but keep the wrapper in place.
- Adopt `drizzle-seed` for the canonical seed flow and retain a compatibility wrapper
  for older entrypoints.
