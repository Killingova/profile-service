import type { FastifyRequest } from "fastify";
import { AppError } from "./errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSingleHeader(request: FastifyRequest, headerName: string): string | undefined {
  const value = request.headers[headerName.toLowerCase()];

  if (Array.isArray(value)) {
    throw new AppError(400, "VALIDATION_FAILED", `${headerName} must be a single header value.`);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (value.includes(",")) {
    throw new AppError(400, "VALIDATION_FAILED", `${headerName} must not contain multiple values.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function assertUuid(value: string, fieldName: string, code = "VALIDATION_FAILED"): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_RE.test(normalized)) {
    throw new AppError(400, code, `${fieldName} must be a valid UUID.`);
  }
  return normalized;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
