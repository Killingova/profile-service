import type { PoolClient } from "pg";
import { schemaTable } from "../../libs/db";
import type { Reading, ReadingAnswer, ReadingCard } from "./types";

type ReadingRow = {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  sourceText: string;
  createdAt: string;
  updatedAt: string;
};

type ReadingCardRow = {
  id: string;
  tenantId: string;
  readingId: string;
  prompt: string;
  cardOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ReadingAnswerRow = {
  id: string;
  tenantId: string;
  cardId: string;
  userId: string;
  answerText: string;
  isCorrect: boolean | null;
  createdAt: string;
  updatedAt: string;
};

const readingsTable = schemaTable("readings");
const readingCardsTable = schemaTable("reading_cards");
const readingAnswersTable = schemaTable("reading_answers");

function toReading(row: ReadingRow): Reading {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    title: row.title,
    sourceText: row.sourceText,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toReadingCard(row: ReadingCardRow): ReadingCard {
  return {
    id: row.id,
    tenantId: row.tenantId,
    readingId: row.readingId,
    prompt: row.prompt,
    cardOrder: row.cardOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toReadingAnswer(row: ReadingAnswerRow): ReadingAnswer {
  return {
    id: row.id,
    tenantId: row.tenantId,
    cardId: row.cardId,
    userId: row.userId,
    answerText: row.answerText,
    isCorrect: row.isCorrect,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listReadings(
  client: PoolClient,
  opts: { tenantId: string; userId: string; limit: number; offset: number },
): Promise<Reading[]> {
  const res = await client.query<ReadingRow>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        user_id AS "userId",
        title,
        source_text AS "sourceText",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ${readingsTable}
      WHERE tenant_id = $1
        AND user_id = $2
      ORDER BY created_at DESC, id ASC
      LIMIT $3
      OFFSET $4
    `,
    [opts.tenantId, opts.userId, opts.limit, opts.offset],
  );

  return res.rows.map(toReading);
}

export async function findReadingById(
  client: PoolClient,
  opts: { tenantId: string; userId: string; readingId: string },
): Promise<Reading | null> {
  const res = await client.query<ReadingRow>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        user_id AS "userId",
        title,
        source_text AS "sourceText",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ${readingsTable}
      WHERE tenant_id = $1
        AND user_id = $2
        AND id = $3
      LIMIT 1
    `,
    [opts.tenantId, opts.userId, opts.readingId],
  );

  const row = res.rows[0];
  return row ? toReading(row) : null;
}

export async function createReading(
  client: PoolClient,
  opts: { tenantId: string; userId: string; title: string; sourceText: string },
): Promise<Reading> {
  const res = await client.query<ReadingRow>(
    `
      INSERT INTO ${readingsTable} (
        tenant_id,
        user_id,
        title,
        source_text
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        tenant_id AS "tenantId",
        user_id AS "userId",
        title,
        source_text AS "sourceText",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [opts.tenantId, opts.userId, opts.title, opts.sourceText],
  );

  return toReading(res.rows[0]);
}

export async function listReadingCards(
  client: PoolClient,
  opts: { tenantId: string; readingId: string },
): Promise<ReadingCard[]> {
  const res = await client.query<ReadingCardRow>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        reading_id AS "readingId",
        prompt,
        card_order AS "cardOrder",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ${readingCardsTable}
      WHERE tenant_id = $1
        AND reading_id = $2
      ORDER BY card_order ASC, id ASC
    `,
    [opts.tenantId, opts.readingId],
  );

  return res.rows.map(toReadingCard);
}

export async function createReadingCard(
  client: PoolClient,
  opts: { tenantId: string; readingId: string; prompt: string; cardOrder?: number },
): Promise<ReadingCard> {
  const res = await client.query<ReadingCardRow>(
    `
      WITH next_order AS (
        SELECT
          CASE
            WHEN $4::int IS NOT NULL THEN $4::int
            ELSE COALESCE(max(card_order), -1) + 1
          END AS ord
        FROM ${readingCardsTable}
        WHERE tenant_id = $1
          AND reading_id = $2
      )
      INSERT INTO ${readingCardsTable} (
        tenant_id,
        reading_id,
        prompt,
        card_order
      )
      SELECT $1, $2, $3, ord
      FROM next_order
      RETURNING
        id,
        tenant_id AS "tenantId",
        reading_id AS "readingId",
        prompt,
        card_order AS "cardOrder",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [opts.tenantId, opts.readingId, opts.prompt, opts.cardOrder ?? null],
  );

  return toReadingCard(res.rows[0]);
}

export async function upsertReadingAnswer(
  client: PoolClient,
  opts: { tenantId: string; cardId: string; userId: string; answerText: string; isCorrect: boolean | null },
): Promise<ReadingAnswer> {
  const res = await client.query<ReadingAnswerRow>(
    `
      INSERT INTO ${readingAnswersTable} (
        tenant_id,
        card_id,
        user_id,
        answer_text,
        is_correct
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (card_id, user_id)
      DO UPDATE SET
        answer_text = EXCLUDED.answer_text,
        is_correct = EXCLUDED.is_correct,
        updated_at = now()
      RETURNING
        id,
        tenant_id AS "tenantId",
        card_id AS "cardId",
        user_id AS "userId",
        answer_text AS "answerText",
        is_correct AS "isCorrect",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [opts.tenantId, opts.cardId, opts.userId, opts.answerText, opts.isCorrect],
  );

  return toReadingAnswer(res.rows[0]);
}

