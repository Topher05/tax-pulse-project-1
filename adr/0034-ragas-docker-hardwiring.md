# ADR-0034: R.A.G.A.S Docker Hardwiring for pgvector-backed Retrieval

## Context
The AI-Assist retrieval and evaluation pipeline depends on PostgreSQL with the `vector`
extension installed. The local seed, hybrid retrieval, and RAGAS collection path all
need a pgvector-capable database to populate `ai_assist_corpus_embedding`, run hybrid
ranking, and collect ranked contexts for evaluation.

The repository already supports a Docker Compose stack that brings up PostgreSQL in a
known-good configuration. 

Native local PostgreSQL installs are not reliable for this as the `vector` extension is an OS-level server dependency extension that needs to be installed as part of the initial install, not
just a SQL-level schema toggle, further it cannot be patched in post install without blowing away the entire setup.

If the extension package is missing, `CREATE EXTENSION
vector;` fails and the retrieval workflow cannot be exercised correctly.

This blocks seeding mock data, running the app locally, and testing/code reviewing

## Decision
Treat Docker layer through `npm run stack:up` as the lifeline for local execution environment for RAGAS collection and
hybrid retrieval verification.

The repository will use the Compose Postgres service as the default local runtime for:

- seeding the corpus tables,
- rebuilding corpus embeddings,
- running hybrid retrieval and reranking smoke checks, and
- collecting RAGAS inputs for offline scoring.

We already have container integrations setup via dockerfiles and a compose-script for wiring up the runtime in other tickets. The container environment already wires the pgvector dependancy into the environment all we need to do is use it and point all scripts to it.

Port: `25432:5432` must be reserved for container integration it sits outside the reserved Windows TCP ports 55366–55565, which includes the formerly assigned 55432

Local native PostgreSQL installs remain acceptable for unrelated parts of the app, but
they are not the supported path for pgvector-backed retrieval verification unless the
`vector` extension is already installed and oeprational on that instance.

## Consequences
* Local retrieval verification becomes reproducible across developer machines.
* Developers no longer need to debug system-level pgvector installation differences
  before exercising the AI-Assist retrieval path.
* The Docker Compose port assignment for Postgres becomes part of the local setup
  contract and must avoid Windows port conflicts.
* Documentation and scripts should direct retrieval-specific workflows toward the
  Compose database rather than a native Postgres instance.
* Non-retrieval application work can still use other local setups, but AI-Assist ranking
  tests, corpus embedding, and RAGAS collection depend on the Dockerized database.

## Alternatives considered
* Require every developer to install pgvector natively. Rejected because Windows and
  OS/package-manager variance makes this brittle and hard to support without `nmake` sideloaded scripts through system32
* Keep the decision implicit in scripts only. Rejected because the retrieval dependency
  is a durable environment constraint that should be explicit.
* Make RAGAS collection work against any Postgres instance and skip vector-based
  retrieval. Rejected because that would not exercise the production retrieval path.
