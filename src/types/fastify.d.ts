import "fastify";
import type { AccessClaims } from "../libs/jwt";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    tenantId?: string;
    userId?: string;
    authClaims?: AccessClaims;
    metricStartMs?: number;
  }

  interface FastifyContextConfig {
    tenantRequired?: boolean;
    authzRequired?: boolean;
  }
}
