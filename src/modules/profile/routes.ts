import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../libs/errors";
import {
  deleteMyProfile,
  getMyPreferences,
  getMyProfile,
  patchMyProfile,
  putMyPreferences,
} from "./service";

const profilePatchSchema = z
  .object({
    displayName: z.string().max(255).nullable().optional(),
    language: z.string().max(10).nullable().optional(),
    timezone: z.string().max(64).nullable().optional(),
  })
  .strict();

const preferencesSchema = z
  .object({
    preferences: z.record(z.string(), z.unknown()),
  })
  .strict();

const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/profiles/me",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const profile = await getMyProfile(context);
      return { profile };
    },
  );

  app.patch(
    "/profiles/me",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const parsed = profilePatchSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_FAILED", "Invalid profile payload.");
      }

      if (Object.keys(parsed.data).length === 0) {
        throw new AppError(400, "VALIDATION_FAILED", "At least one profile field is required.");
      }

      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const profile = await patchMyProfile(context, parsed.data);
      return { profile };
    },
  );

  app.get(
    "/profiles/me/preferences",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const preferences = await getMyPreferences(context);
      return { preferences };
    },
  );

  app.put(
    "/profiles/me/preferences",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const parsed = preferencesSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_FAILED", "Invalid preferences payload.");
      }

      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const preferences = await putMyPreferences(context, parsed.data.preferences);
      return { preferences };
    },
  );

  app.delete(
    "/profiles/me",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const result = await deleteMyProfile(context);
      return result;
    },
  );
};

export default profileRoutes;
