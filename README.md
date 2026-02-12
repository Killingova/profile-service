# Profile Service

Production-oriented profile service for SaaS/microservices with strict tenant isolation.

## Current Status (2026-02-12 14:37:47 CET)

- Container `profile-service-stack-profile-service-1` is `healthy`.
- Gateway check `https://127.0.0.1:8443/health/profile` returns `200`.
- DB readiness in response is `{\"db\":\"ok\"}`.

## Security Contract

- `X-Tenant-Id` is required on business routes and must be a UUID.
- `X-Request-Id` is accepted or generated and always returned.
- AuthZ is explicit via `AUTHZ_MODE`:
  - `gateway_headers` (default): requires `X-User-Id`, blocks `Authorization`.
  - `service_jwt`: requires `Authorization: Bearer`, blocks `X-User-Id`.
- Mixed auth context is rejected with `400 AUTH_CONTEXT_INVALID`.
- Error envelope is stable:

```json
{
  "status": 400,
  "error": { "code": "VALIDATION_FAILED", "message": "..." },
  "request_id": "..."
}
```

## RLS and Pooling Contract

All tenant-bound database operations run inside a transaction and set context locally:

```sql
BEGIN;
SET LOCAL ROLE app_profile;
SELECT set_config('app.tenant', '<tenant_uuid>', true);
SELECT set_config('app.user_id', '<user_uuid>', true);
-- queries
COMMIT;
```

RLS policies use `meta.require_tenant()` and tables run with `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.

## API (minimum)

- `GET /profiles/me`
- `PATCH /profiles/me`
- `DELETE /profiles/me`
- `GET /profiles/me/preferences`
- `PUT /profiles/me/preferences`
- `GET /health/live`
- `GET /health/ready`
- `GET /health/db`
- `GET /openapi.json` (if enabled)
- `GET /metrics` (if enabled)

## SQL Layout

- `sql/init/*`: baseline schema, RLS, grants.
- `sql/migrations/*`: forward migrations.

## Make Targets

- `make check`: typecheck + unit tests + secret scan.
- `make db-reset`: drop profile schema (dev-only) and run init SQL.
- `make migrate`: run init + migration SQL.
- `make e2e`: run test suite.
- `make gold`: check + compose up + wait + migrate + e2e.

## DSAR / Retention

- `DELETE /profiles/me` performs soft delete/anonymization (`deleted_at`, profile fields scrubbed).
- Audit data stays append-only in `profile.profile_events`.
- Integration event `profile.deleted` is written to `profile.outbox_events`.
- Retention windows must be defined by policy (for example: events 90d, audit 365d).
