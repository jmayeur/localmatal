export const ErrorCode = {
  TURNSTILE_FAILED: 'TURNSTILE_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  BOT_DETECTED: 'BOT_DETECTED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_REJECTED: 'FILE_TYPE_REJECTED',
  FACE_DETECTED: 'FACE_DETECTED',
  NSFW_DETECTED: 'NSFW_DETECTED',
  CONCEPT_OVERLAP_FAILED: 'CONCEPT_OVERLAP_FAILED',
  SUBMISSIONS_PAUSED: 'SUBMISSIONS_PAUSED',
  INVALID_REASON: 'INVALID_REASON',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
