import { withTenantTx } from "../../libs/db";
import { mapDbError } from "../../libs/error-map";
import { AppError } from "../../libs/errors";
import { recordProfileRead, recordProfileWrite } from "../../libs/metrics";
import {
  createProfile,
  findProfile,
  getOrCreatePreferences,
  insertOutboxEvent,
  insertProfileEvent,
  patchProfile,
  replacePreferences,
  softDeleteProfile,
} from "./repository";
import type {
  Profile,
  ProfileContext,
  ProfilePatch,
  ProfilePreferences,
} from "./types";

async function runDb<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw mapDbError(error);
  }
}

export async function getMyProfile(context: ProfileContext): Promise<Profile> {
  return runDb(async () =>
    withTenantTx(context, async (client) => {
      const existing = await findProfile(client, context.userId, context.tenantId);
      const profile = existing && !existing.deletedAt
        ? existing
        : await createProfile(client, context.userId, context.tenantId);

      recordProfileRead();
      return profile;
    }),
  );
}

export async function patchMyProfile(
  context: ProfileContext,
  patch: ProfilePatch,
): Promise<Profile> {
  if (Object.keys(patch).length === 0) {
    throw new AppError(400, "VALIDATION_FAILED", "At least one field is required.");
  }

  return runDb(async () => {
    try {
      const result = await withTenantTx(context, async (client) => {
        const existing = await findProfile(client, context.userId, context.tenantId);
        if (!existing || existing.deletedAt) {
          await createProfile(client, context.userId, context.tenantId);
        }

        const updated = await patchProfile(client, context.userId, context.tenantId, patch);
        await insertProfileEvent(client, {
          tenantId: context.tenantId,
          userId: context.userId,
          action: "profile.updated",
          payload: {
            fields: Object.keys(patch),
          },
          idempotencyKey: context.requestId,
        });

        return updated;
      });

      recordProfileWrite(true);
      return result;
    } catch (error) {
      recordProfileWrite(false);
      throw error;
    }
  });
}

export async function getMyPreferences(
  context: ProfileContext,
): Promise<ProfilePreferences> {
  return runDb(async () =>
    withTenantTx(context, async (client) => {
      const preferences = await getOrCreatePreferences(client, context.userId, context.tenantId);
      recordProfileRead();
      return preferences;
    }),
  );
}

export async function putMyPreferences(
  context: ProfileContext,
  preferences: Record<string, unknown>,
): Promise<ProfilePreferences> {
  return runDb(async () => {
    try {
      const result = await withTenantTx(context, async (client) => {
        const updated = await replacePreferences(
          client,
          context.userId,
          context.tenantId,
          preferences,
        );

        await insertProfileEvent(client, {
          tenantId: context.tenantId,
          userId: context.userId,
          action: "profile.preferences.updated",
          payload: {
            version: updated.version,
          },
          idempotencyKey: context.requestId,
        });

        return updated;
      });

      recordProfileWrite(true);
      return result;
    } catch (error) {
      recordProfileWrite(false);
      throw error;
    }
  });
}

export async function deleteMyProfile(context: ProfileContext): Promise<{ deleted: boolean }> {
  return runDb(async () =>
    withTenantTx(context, async (client) => {
      const deleted = await softDeleteProfile(client, context.userId, context.tenantId);

      if (!deleted) {
        return { deleted: false };
      }

      const payload = {
        deleted_at: deleted.deletedAt,
        reason: "user_requested",
      };

      await insertProfileEvent(client, {
        tenantId: context.tenantId,
        userId: context.userId,
        action: "profile.deleted",
        payload,
        idempotencyKey: context.requestId,
      });

      await insertOutboxEvent(client, {
        tenantId: context.tenantId,
        userId: context.userId,
        eventType: "profile.deleted",
        payload,
        idempotencyKey: context.requestId,
      });

      return { deleted: true };
    }),
  );
}
