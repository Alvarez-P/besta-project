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

Express has no `app.listen()`. It only runs inside Lambda via `@vendia/serverless-express`. All testing is done against deployed API Gateway. Use `endpoints.http` (VS Code REST Client) for manual testing.

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

## Response format

All endpoints return:
- Success: `{ success: true, data, meta? }`
- Error: `{ success: false, error: { code, message, details? } }`

Technical details are never exposed in 5xx responses.

## No tests

No test framework, no test scripts, no test directory. Manual validation only.
