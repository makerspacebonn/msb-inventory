/**
 * Errors that server functions throw on purpose. Each has a code the client
 * can react to, a message meant for the user and an HTTP status.
 *
 * Rule of thumb: an expected outcome the UI shows as part of the flow
 * (e.g. "undo blocked by a newer change") is a result like
 * `{ success: false, error }`; a request that can't be served throws an
 * AppError. Any other error is a bug, and its message stays out of the UI
 * (see `errorMessage`).
 *
 * Kept free of framework imports, so server, client and tests can use it.
 * The serialization adapter in `src/start.ts` brings the class across the
 * server function boundary, which by default only keeps an error's message.
 */

const STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  NOT_CONFIGURED: 503,
  AI_RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  AI_FAILED: 502,
} as const

export type ErrorCode = keyof typeof STATUS

/** The plain data form of an AppError, as sent to the client */
export type AppErrorData = {
  code: ErrorCode
  message: string
  statusCode: number
}

export class AppError extends Error {
  override name = "AppError"
  readonly statusCode: number

  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
    this.statusCode = STATUS[code]
  }

  toJSON(): AppErrorData {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    }
  }

  static fromJSON(data: AppErrorData): AppError {
    return new AppError(data.code, data.message)
  }
}

export function isAppError(
  error: unknown,
  code?: ErrorCode,
): error is AppError {
  return (
    error instanceof AppError && (code === undefined || error.code === code)
  )
}

/**
 * The text to show the user for a failed action: an AppError's own
 * message, otherwise the fallback, as other errors may carry technical
 * details (SQL, file paths) that are neither helpful nor meant to be public
 */
export function errorMessage(error: unknown, fallback: string): string {
  return isAppError(error) ? error.message : fallback
}
