import { withTenantTx } from "../../libs/db";
import { mapDbError } from "../../libs/error-map";
import { AppError } from "../../libs/errors";
import {
  createReading,
  createReadingCard,
  findReadingById,
  listReadingCards,
  listReadings,
  upsertReadingAnswer,
} from "./repository";
import type {
  CreateReadingCardInput,
  CreateReadingInput,
  ReadingsContext,
  Reading,
  ReadingCard,
  UpsertReadingAnswerInput,
  ReadingAnswer,
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

export async function listMyReadings(
  context: ReadingsContext,
  opts: { limit: number; offset: number },
): Promise<Reading[]> {
  return runDb(async () =>
    withTenantTx(context, async (client) =>
      listReadings(client, {
        tenantId: context.tenantId,
        userId: context.userId,
        limit: opts.limit,
        offset: opts.offset,
      }),
    ),
  );
}

export async function createMyReading(
  context: ReadingsContext,
  input: CreateReadingInput,
): Promise<Reading> {
  if (!input.title.trim()) {
    throw new AppError(400, "VALIDATION_FAILED", "title is required.");
  }
  if (!input.sourceText.trim()) {
    throw new AppError(400, "VALIDATION_FAILED", "sourceText is required.");
  }

  return runDb(async () =>
    withTenantTx(context, async (client) =>
      createReading(client, {
        tenantId: context.tenantId,
        userId: context.userId,
        title: input.title.trim(),
        sourceText: input.sourceText,
      }),
    ),
  );
}

export async function getMyReadingWithCards(
  context: ReadingsContext,
  readingId: string,
): Promise<{ reading: Reading; cards: ReadingCard[] }> {
  return runDb(async () =>
    withTenantTx(context, async (client) => {
      const reading = await findReadingById(client, {
        tenantId: context.tenantId,
        userId: context.userId,
        readingId,
      });
      if (!reading) {
        throw new AppError(404, "NOT_FOUND", "Reading not found.");
      }

      const cards = await listReadingCards(client, {
        tenantId: context.tenantId,
        readingId,
      });

      return { reading, cards };
    }),
  );
}

export async function addCardToMyReading(
  context: ReadingsContext,
  readingId: string,
  input: CreateReadingCardInput,
): Promise<ReadingCard> {
  if (!input.prompt.trim()) {
    throw new AppError(400, "VALIDATION_FAILED", "prompt is required.");
  }

  return runDb(async () =>
    withTenantTx(context, async (client) => {
      const reading = await findReadingById(client, {
        tenantId: context.tenantId,
        userId: context.userId,
        readingId,
      });
      if (!reading) {
        throw new AppError(404, "NOT_FOUND", "Reading not found.");
      }

      return createReadingCard(client, {
        tenantId: context.tenantId,
        readingId,
        prompt: input.prompt.trim(),
        cardOrder: input.cardOrder,
      });
    }),
  );
}

export async function upsertMyAnswerForCard(
  context: ReadingsContext,
  cardId: string,
  input: UpsertReadingAnswerInput,
): Promise<ReadingAnswer> {
  if (!input.answerText.trim()) {
    throw new AppError(400, "VALIDATION_FAILED", "answerText is required.");
  }

  return runDb(async () =>
    withTenantTx(context, async (client) =>
      upsertReadingAnswer(client, {
        tenantId: context.tenantId,
        cardId,
        userId: context.userId,
        answerText: input.answerText,
        isCorrect: typeof input.isCorrect === "boolean" ? input.isCorrect : null,
      }),
    ),
  );
}

