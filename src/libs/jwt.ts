import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "./env";
import { AppError } from "./errors";

export interface AccessClaims extends JwtPayload {
  sub: string;
  typ?: string;
  tid?: string;
  tenant_id?: string;
  permissions?: string[];
  roles?: string[];
}

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "MISSING_AUTH", "Missing bearer token.");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new AppError(401, "MISSING_AUTH", "Missing bearer token.");
  }

  return token;
}

export function verifyAccessToken(token: string): AccessClaims {
  const secret = env.SERVICE_JWT_PUBLIC_OR_HS_SECRET;
  if (!secret) {
    throw new AppError(500, "INTERNAL", "JWT verification secret is not configured.");
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      clockTolerance: env.JWT_CLOCK_SKEW_SEC,
    }) as JwtPayload;

    if (decoded.typ !== "access") {
      throw new AppError(401, "INVALID_AUTH", "Invalid access token.");
    }

    if (typeof decoded.sub !== "string") {
      throw new AppError(401, "INVALID_AUTH", "Invalid access token.");
    }

    return decoded as AccessClaims;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, "INVALID_AUTH", "Invalid access token.");
  }
}
