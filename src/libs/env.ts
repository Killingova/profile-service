import { readFileSync } from "node:fs";
import { z } from "zod";

export type AuthzMode = "gateway_headers" | "service_jwt";

function readSecretFile(pathValue: string | undefined, label: string): string | undefined {
  if (!pathValue) {
    return undefined;
  }

  let value: string;
  try {
    value = readFileSync(pathValue, "utf8");
  } catch {
    throw new Error(`${label} is not readable: ${pathValue}`);
  }

  const trimmed = value.replace(/\r?\n+$/, "").trim();
  if (!trimmed) {
    throw new Error(`${label} is empty: ${pathValue}`);
  }

  return trimmed;
}

function resolveSecret(opts: {
  filePath?: string;
  envValue?: string;
  label: string;
  allowEnvFallback: boolean;
}): string | undefined {
  const fromFile = readSecretFile(opts.filePath, opts.label);
  if (fromFile) {
    return fromFile;
  }

  if (opts.allowEnvFallback && opts.envValue && opts.envValue.trim() !== "") {
    return opts.envValue.trim();
  }

  return undefined;
}

function mask(value: string | undefined): string {
  return value ? "[set]" : "[unset]";
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.string().default("info"),

  AUTHZ_MODE: z.enum(["gateway_headers", "service_jwt"]).default("gateway_headers"),
  REQUEST_ID_HEADER: z.string().default("x-request-id"),
  TENANT_HEADER: z.string().default("x-tenant-id"),
  USER_HEADER: z.string().default("x-user-id"),

  ALLOW_ENV_FALLBACK: z.coerce.boolean().default(false),
  STARTUP_VALIDATE_ENV: z.coerce.boolean().optional(),

  DATABASE_URL: z.string().optional(),
  DATABASE_URL_FILE: z.string().optional(),

  DB_HOST: z.string().default("auth-db"),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default("authdb"),
  DB_USER: z.string().default("auth_runtime"),
  DB_PASSWORD: z.string().optional(),
  DB_PASSWORD_FILE: z.string().optional(),
  DB_SCHEMA: z.string().default("profile"),
  DB_ROLE: z.string().default("app_profile"),

  SERVICE_JWT_PUBLIC_OR_HS_SECRET: z.string().optional(),
  SERVICE_JWT_PUBLIC_OR_HS_SECRET_FILE: z.string().optional(),
  JWT_ISSUER: z.string().default("auth-service"),
  JWT_AUDIENCE: z.string().default("auth-client"),
  JWT_CLOCK_SKEW_SEC: z.coerce.number().int().min(0).max(300).default(60),

  OPENAPI_ENABLED: z.coerce.boolean().default(true),
  METRICS_ENABLED: z.coerce.boolean().default(true),

  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_PASSWORD_FILE: z.string().optional(),
});

const parsed = envSchema.parse(process.env);
const allowEnvFallback = parsed.ALLOW_ENV_FALLBACK;

const databaseUrl = resolveSecret({
  label: "DATABASE_URL_FILE",
  filePath: parsed.DATABASE_URL_FILE,
  envValue: parsed.DATABASE_URL,
  allowEnvFallback,
});

const dbPassword = resolveSecret({
  label: "DB_PASSWORD_FILE",
  filePath: parsed.DB_PASSWORD_FILE,
  envValue: parsed.DB_PASSWORD,
  allowEnvFallback,
});

const serviceJwtSecret = resolveSecret({
  label: "SERVICE_JWT_PUBLIC_OR_HS_SECRET_FILE",
  filePath: parsed.SERVICE_JWT_PUBLIC_OR_HS_SECRET_FILE,
  envValue: parsed.SERVICE_JWT_PUBLIC_OR_HS_SECRET,
  allowEnvFallback,
});

const shouldValidate =
  parsed.STARTUP_VALIDATE_ENV !== undefined
    ? parsed.STARTUP_VALIDATE_ENV
    : parsed.NODE_ENV !== "test";

if (shouldValidate) {
  if (!databaseUrl && !dbPassword) {
    throw new Error(
      "Database secret missing: set DATABASE_URL_FILE or DB_PASSWORD_FILE (ENV fallback only when ALLOW_ENV_FALLBACK=true).",
    );
  }

  if (parsed.AUTHZ_MODE === "service_jwt" && !serviceJwtSecret) {
    throw new Error(
      "SERVICE_JWT_PUBLIC_OR_HS_SECRET_FILE is required when AUTHZ_MODE=service_jwt.",
    );
  }
}

export const env = {
  ...parsed,
  DATABASE_URL: databaseUrl,
  DB_PASSWORD: dbPassword,
  SERVICE_JWT_PUBLIC_OR_HS_SECRET: serviceJwtSecret,
};

export type Env = typeof env;

export function logEnvSummary(logger: (message: string, meta?: unknown) => void = console.info): void {
  logger("[env] profile-service config", {
    NODE_ENV: env.NODE_ENV,
    HOST: env.HOST,
    PORT: env.PORT,
    AUTHZ_MODE: env.AUTHZ_MODE,
    REQUEST_ID_HEADER: env.REQUEST_ID_HEADER,
    TENANT_HEADER: env.TENANT_HEADER,
    USER_HEADER: env.USER_HEADER,
    DB_HOST: env.DB_HOST,
    DB_PORT: env.DB_PORT,
    DB_NAME: env.DB_NAME,
    DB_USER: env.DB_USER,
    DB_SCHEMA: env.DB_SCHEMA,
    DB_ROLE: env.DB_ROLE,
    DATABASE_URL: mask(env.DATABASE_URL),
    DB_PASSWORD: mask(env.DB_PASSWORD),
    SERVICE_JWT_PUBLIC_OR_HS_SECRET: mask(env.SERVICE_JWT_PUBLIC_OR_HS_SECRET),
    OPENAPI_ENABLED: env.OPENAPI_ENABLED,
    METRICS_ENABLED: env.METRICS_ENABLED,
  });
}
