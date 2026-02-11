export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type ErrorResponse = {
  status: number;
  error: {
    code: string;
    message: string;
  };
  request_id?: string;
};

export function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId?: string,
): ErrorResponse {
  return {
    status,
    error: {
      code,
      message,
    },
    ...(requestId ? { request_id: requestId } : {}),
  };
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(500, "INTERNAL", "Internal server error.");
}
