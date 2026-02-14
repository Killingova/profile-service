export interface Reading {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  sourceText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingCard {
  id: string;
  tenantId: string;
  readingId: string;
  prompt: string;
  cardOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingAnswer {
  id: string;
  tenantId: string;
  cardId: string;
  userId: string;
  answerText: string;
  isCorrect: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingsContext {
  tenantId: string;
  userId: string;
  requestId?: string;
}

export interface CreateReadingInput {
  title: string;
  sourceText: string;
}

export interface CreateReadingCardInput {
  prompt: string;
  cardOrder?: number;
}

export interface UpsertReadingAnswerInput {
  answerText: string;
  isCorrect?: boolean | null;
}

