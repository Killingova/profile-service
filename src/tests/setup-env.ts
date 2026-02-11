process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.ALLOW_ENV_FALLBACK = process.env.ALLOW_ENV_FALLBACK ?? "true";
process.env.DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
process.env.DB_PORT = process.env.DB_PORT ?? "5432";
process.env.DB_NAME = process.env.DB_NAME ?? "authdb";
process.env.DB_USER = process.env.DB_USER ?? "auth";
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "test-password";
process.env.DB_SCHEMA = process.env.DB_SCHEMA ?? "profile";
process.env.DB_ROLE = process.env.DB_ROLE ?? "app_profile";
process.env.SERVICE_JWT_PUBLIC_OR_HS_SECRET =
  process.env.SERVICE_JWT_PUBLIC_OR_HS_SECRET ?? "test-secret";
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? "auth-service";
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "auth-client";
process.env.OPENAPI_ENABLED = process.env.OPENAPI_ENABLED ?? "true";
process.env.METRICS_ENABLED = process.env.METRICS_ENABLED ?? "true";
