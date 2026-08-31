# Docker and Compose

TaxPulse supports standalone Core and Tax Engine containers and a full local Compose
stack. Start Docker Desktop or a compatible Docker Engine first.

## Core Case Service Container

Build and run the service from the repository root:

```bash
docker build -t taxpulse/case-service .
docker run --name case-service -p 3000:3000 --env-file .env taxpulse/case-service
```

The service listens on `http://localhost:3000`. Its `.env` configuration includes
`DATABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_SIGNING_PRIVATE_KEY`, and
`JWT_SIGNING_KEY_ID`. When the container connects to PostgreSQL on the host,
`DATABASE_URL` must use `host.docker.internal` rather than `localhost`.

The Core Case Service alone receives the RSA private key. It publishes the corresponding
public key at `/.well-known/jwks.json` and OpenID Connect discovery metadata at
`/.well-known/openid-configuration`.

## Tax Engine Container

```bash
docker build -f Dockerfile.tax-engine -t taxpulse/tax-engine .
docker run --name tax-engine -p 8000:8000 --env JWT_ISSUER --env JWT_JWKS_URL taxpulse/tax-engine
```

The Tax Engine listens on `http://localhost:8000`, and its healthcheck calls
`GET /health`. It requires `JWT_ISSUER` and `JWT_JWKS_URL` to validate RS256 access
tokens. Export those two values in the invoking shell before starting the container. Never
pass the shared `.env` file or the issuer's private signing key to the Tax Engine.

## Full Local Stack

Copy [`.env.example`](../.env.example) to `.env` and replace its placeholders. The stack
requires PostgreSQL credentials, an RSA signing key and key ID, `OPENAI_API_KEY`, and the
tenant corpus scope map.

Start and verify the stack:

```powershell
npm run stack:up
npm run stack:smoke
```

The stack provides:

- Core Case Service at `http://localhost:3000`
- Tax Engine at `http://localhost:8000`
- PostgreSQL at `localhost:25432`
- Redis at `localhost:6379`
- RedisInsight at `http://localhost:5540`

`stack:up` first stops the standalone Redis Compose project, then starts Redis as part of
the full project. Containers communicate over Compose DNS: Core reaches PostgreSQL at
`postgres:5432`, Redis at `taxpulse-redis:6379`, and the Tax Engine at
`tax-engine:8000`.

The one-shot `core-case-seed` service runs Drizzle migrations and loads synthetic seed
data before Core starts. This is destructive to the local Compose database. The
`core-case-corpus-embed` service then prepares the checked-in synthetic corpus.

The smoke check verifies both service health endpoints, Redis reachability, and a
synthetic registration request against PostgreSQL-backed authentication tables.

Override host ports when standalone containers already use the defaults:

```powershell
$env:TAXPULSE_CORE_HOST_PORT = "3001"
$env:TAXPULSE_STACK_CORE_URL = "http://127.0.0.1:3001"
npm run stack:up
npm run stack:smoke
```

Stop the stack with:

```powershell
npm run stack:down
```
