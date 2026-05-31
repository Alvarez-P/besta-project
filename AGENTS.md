# AGENTS.md

## Quick start

```bash
nvm use                    # Node 20.20.2
npm install                # .npmrc has ignore-scripts=true
npm run prepare            # installs husky hooks (skipped by npm install)
npm run typecheck          # verifies both tsconfigs
npm run check              # biome format + lint + organize imports
```

Deploy:
```bash
npm run deploy -- --context environment=dev
# With DBeaver access:
npm run deploy -- --context environment=dev --context rds-allowed-ip=X.X.X.X/32
```

## Architecture

Two separate compilation units:

| tsconfig | Scope | Purpose |
|----------|-------|---------|
| `tsconfig.json` | `bin/`, `lib/` | CDK infrastructure code |
| `tsconfig.lambda.json` | `src/` | Express API (bundled into Lambda) |

`npm run typecheck` runs both. They do NOT share includes.

## CDK bundling (Lambda)

esbuild bundles the Lambda. Two specific modules need special handling in `lib/besta-stack.ts`:

```
externalModules: ['pg-hstore']   // Sequelize postgres dep, never loaded
nodeModules:     ['mysql2']      // Native driver, must be copied to bundle
```

Adding or removing dependencies may require updating either list. `mysql2` needs `nodeModules` because esbuild cannot bundle its optional native bindings. `pg-hstore` needs `externalModules` to prevent esbuild from trying to resolve it (it's a transitive dep of sequelize, unused with MySQL).

## `tsconfig.lambda.json` path alias

`base.repository.ts` imports types from `sequelize/lib/utils` (an internal path). The tsconfig maps it:

```json
"paths": {
  "sequelize/lib/utils": ["./node_modules/sequelize/types/utils"]
}
```

Without this, typecheck fails on `sequelize/lib/utils`.

## No local dev server

Express has no `app.listen()`. It only runs inside Lambda via `@vendia/serverless-express`. Use `endpoints.http` (VS Code REST Client) for manual testing against deployed API Gateway.

## Tests

```bash
npm test                   # runs all 54 unit tests (9 suites)
npm run test:coverage      # with coverage report
```

All tests run offline (no AWS, no MySQL):

- **`tests/jest.config.ts`** — ts-jest with dedicated `tsconfig.test.json`
- **`tests/setup.ts`** — mocks `@aws-sdk/client-secrets-manager`, `@aws-sdk/client-ses`, `getJwtSecret()`, and replaces Sequelize MySQL with SQLite in-memory
- **`tests/__mocks__/`** — AWS SDK mock factories (Secrets Manager, SES, DynamoDB)

Tests are organized by layer under `tests/unit/`:
| Directory | Scope |
|----------|-------|
| `application/` | Use cases with real SQLite-backed Sequelize |
| `infrastructure/` | Circuit breaker, rate limiter, idempotency middleware |

**sqlite3 native addon:** `.npmrc` has `ignore-scripts=true`, so after `npm install`, run `npx node-gyp rebuild --directory=node_modules/sqlite3` to compile the SQLite binding.

## JWT secret resolution

`jwt-secret.ts` tries 4 sources in order:
1. In-memory cache
2. `JWT_SECRET` env var (quick override)
3. `JWT_SECRET_ARN` → Secrets Manager (CDK-generated, 32-char random)
4. `jwtSecret` field inside the RDS secret (`DB_SECRET_ARN`)

The CDK stack creates a dedicated JWT secret (#3). Sources #2 and #4 are fallbacks.

## Node version mismatch

- Local: `20.20.2` (`.nvmrc`)
- CI (`deploy-qa.yml`): `24`

CI only deploys, does not run typecheck or tests.

## Pre-commit hook

`.husky/pre-commit` requires `nvm` at `$HOME/.nvm`. It sources nvm, switches to the project Node version, and runs `lint-staged` (biome check on staged files).

`.npmrc` has `ignore-scripts=true`, so `npm run prepare` must be called explicitly after `npm install` or the hook won't be active.

## UserModel id column

Must be `DataTypes.UUID` with `defaultValue: DataTypes.UUIDV4`. Using `DataTypes.UUIDV4` as the column type silently fails `sequelize.sync()` on MySQL — the table is never created and Sequelize throws "table doesn't exist" at query time.

## Swagger

Served as a static HTML page at `/api-docs`. Loads Swagger UI from CDN (unpkg.com). No npm dependency, no binary media types, no nodeModules. The OpenAPI spec is at `/api-docs.json`. The server URL in the spec is `/prod` — update it when changing the API Gateway stage.

## Middleware pipeline

`server.ts` registers middlewares in order before routes:

1. `rateLimiter({ windowMs: 60_000, maxRequests: 100 })` — sliding window per IP, returns 429 on limit
2. `express.json()` — body parsing
3. `idempotency({ circuitBreakers: [sesBreaker, dbBreaker] })` — DynamoDB-backed, checks header `Idempotency-Key` on mutating methods (POST, PUT, DELETE). Returns 503 early if any breaker is OPEN.

`sesBreaker` and `dbBreaker` are exported singletons instantiated in `server.ts` and passed to use cases.

### CircuitBreaker (`circuit-breaker.ts`)

Generic state machine — CLOSED → OPEN → HALF_OPEN. Used to wrap:
- **SES**: email sending in `CreateUserUseCase` and `UpdateUserUseCase`
- **DB**: `sequelize.authenticate()` in health check

### Idempotency table (`idempotency.repository.ts`)

DynamoDB table created by CDK:
- PK: `idempotencyKey` (string)
- TTL attribute: `expiresAt` (unix timestamp, 30 min)
- Additional: `response` (serialized JSON), `statusCode` (number)

CDK grants `dynamodb:GetItem` + `dynamodb:PutItem` + `dynamodb:DeleteItem` to the Lambda role. The `@aws-sdk/lib-dynamodb` DocumentClient doesn't need `nodeModules` in esbuild (it has no native bindings).

## Response format

All endpoints return:
- Success: `{ success: true, data, meta? }`
- Error: `{ success: false, error: { code, message, details? } }`

Technical details are never exposed in 5xx responses.
