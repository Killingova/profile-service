import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../libs/errors";
import { assertUuid } from "../../libs/headers";
import {
  addCardToMyReading,
  createMyReading,
  getMyReadingWithCards,
  listMyReadings,
  upsertMyAnswerForCard,
} from "./service";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
}).strict();

const createReadingSchema = z.object({
  title: z.string().min(1).max(255),
  sourceText: z.string().min(1).max(100_000),
}).strict();

const createCardSchema = z.object({
  prompt: z.string().min(1).max(2_000),
  cardOrder: z.coerce.number().int().min(0).optional(),
}).strict();

const upsertAnswerSchema = z.object({
  answerText: z.string().min(1).max(10_000),
  isCorrect: z.boolean().nullable().optional(),
}).strict();

const readingsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/readings",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const parsed = listQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_FAILED", "Invalid query parameters.");
      }

      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const items = await listMyReadings(context, parsed.data);
      return { readings: items, limit: parsed.data.limit, offset: parsed.data.offset };
    },
  );

  app.post(
    "/readings",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const parsed = createReadingSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_FAILED", "Invalid reading payload.");
      }

      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const reading = await createMyReading(context, parsed.data);
      return { reading };
    },
  );

  app.get(
    "/readings/:readingId",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const readingIdRaw = (request.params as any).readingId;
      if (typeof readingIdRaw !== "string") {
        throw new AppError(400, "VALIDATION_FAILED", "readingId is required.");
      }
      const readingId = assertUuid(readingIdRaw, "readingId", "VALIDATION_FAILED");
      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const result = await getMyReadingWithCards(context, readingId);
      return result;
    },
  );

  app.post(
    "/readings/:readingId/cards",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const readingIdRaw = (request.params as any).readingId;
      if (typeof readingIdRaw !== "string") {
        throw new AppError(400, "VALIDATION_FAILED", "readingId is required.");
      }
      const readingId = assertUuid(readingIdRaw, "readingId", "VALIDATION_FAILED");
      const parsed = createCardSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_FAILED", "Invalid card payload.");
      }

      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const card = await addCardToMyReading(context, readingId, parsed.data);
      return { card };
    },
  );

  app.put(
    "/readings/cards/:cardId/answer",
    {
      config: {
        tenantRequired: true,
        authzRequired: true,
      },
    },
    async (request) => {
      const cardIdRaw = (request.params as any).cardId;
      if (typeof cardIdRaw !== "string") {
        throw new AppError(400, "VALIDATION_FAILED", "cardId is required.");
      }
      const cardId = assertUuid(cardIdRaw, "cardId", "VALIDATION_FAILED");
      const parsed = upsertAnswerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_FAILED", "Invalid answer payload.");
      }

      const context = {
        tenantId: request.tenantId!,
        userId: request.userId!,
        requestId: request.requestId,
      };

      const answer = await upsertMyAnswerForCard(context, cardId, parsed.data);
      return { answer };
    },
  );
};

export default readingsRoutes;
