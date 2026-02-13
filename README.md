# Profile Service

Produktionsnaher Profile-Service fuer SaaS/Microservices mit strikter Tenant-Isolation.

## Zweck / Boundary
- Verwaltet Profil- und Praeferenzdaten fuer authentifizierte Nutzer pro Tenant.
- Erzwingt Tenant-Kontext auf API- und DB-Ebene (RLS + GUC).
- Kein direkter Public-Zugriff auf DB, kein Vertrauen auf ungepruefte Header.

## Aktueller Stand (2026-02-12 15:32:39 CET)
- Container `profile-service-stack-profile-service-1` laeuft `healthy`.
- Gateway-Check `https://127.0.0.1:8443/health/profile` liefert `200`.
- DB-Readiness im Response-Check:

```json
{"db":"ok"}
```

## Security Contract
- `X-Tenant-Id` ist auf Business-Routen Pflicht und muss UUID sein.
- `X-Request-Id` wird akzeptiert oder erzeugt und immer zurueckgegeben.
- AuthZ ist explizit via `AUTHZ_MODE`:
  - `gateway_headers` (Default): erwartet `X-User-Id`, blockiert `Authorization`.
  - `service_jwt`: erwartet `Authorization: Bearer`, blockiert `X-User-Id`.
- Gemischter Auth-Kontext wird mit `400 AUTH_CONTEXT_INVALID` abgewiesen.
- Stabiler Error-Envelope:

```json
{
  "status": 400,
  "error": { "code": "VALIDATION_FAILED", "message": "..." },
  "request_id": "..."
}
```

## RLS-/Pooling-Vertrag
Alle tenant-gebundenen DB-Operationen laufen transaktional mit lokalem Kontext:

```sql
BEGIN;
SET LOCAL ROLE app_profile;
SELECT set_config('app.tenant', '<tenant_uuid>', true);
SELECT set_config('app.user_id', '<user_uuid>', true);
-- queries
COMMIT;
```

RLS-Policies verwenden `meta.require_tenant()`, Tabellen laufen mit `ENABLE ROW LEVEL SECURITY` und `FORCE ROW LEVEL SECURITY`.

## Ops
```bash
# Checks und Tests
make check
make e2e

# DB-Routinen (DEV)
make db-reset
make migrate

# Voller Goldlauf
make gold
```

## DoD Checks
```bash
curl -ks https://127.0.0.1:8443/health/profile
curl -ks https://127.0.0.1:8443/healthz
```

Erwartung:
- Gateway/Service-Health `200`.
- Kein direkter DB-Zugriff vom Edge.
- Tenant- und Auth-Kontrakt sind aktiv.

## API (Minimum)
- `GET /profiles/me`
- `PATCH /profiles/me`
- `DELETE /profiles/me`
- `GET /profiles/me/preferences`
- `PUT /profiles/me/preferences`
- `GET /health/live`
- `GET /health/ready`
- `GET /health/db`
- `GET /openapi.json` (falls aktiv)
- `GET /metrics` (falls aktiv)

## SQL Layout
- `sql/init/*`: Basisschema, RLS, Grants.
- `sql/migrations/*`: Forward-Migrations.

## DSAR / Retention
- `DELETE /profiles/me` fuehrt Soft-Delete/Anonymisierung aus (`deleted_at`, Profilfelder bereinigt).
- Audit bleibt append-only in `profile.profile_events`.
- Integrationsereignis `profile.deleted` wird in `profile.outbox_events` geschrieben.

## Guardrails
- Kein gemischter Auth-Kontext (`Authorization` + `X-User-Id`).
- Kein Tenant-Fallback ohne validen Tenant-Header.
- Keine Secrets im Repo.
