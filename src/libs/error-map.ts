import { AppError } from "./errors";

export function mapDbError(error: unknown): AppError {
  const dbCode = typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined;

  switch (dbCode) {
    case "23505":
      return new AppError(409, "CONFLICT", "Resource already exists.");
    case "23502":
    case "23503":
    case "23514":
    case "22P02":
      return new AppError(400, "VALIDATION_FAILED", "Invalid request payload.");
    default:
      return new AppError(500, "INTERNAL", "Internal server error.");
  }
}
