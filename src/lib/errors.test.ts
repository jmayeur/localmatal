import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode } from './errors';

describe('AppError', () => {
  it('is an instance of Error', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('exposes code, httpStatus, and optional field', () => {
    const err = new AppError(ErrorCode.TURNSTILE_FAILED, 'Bot check failed', 400, 'token');
    expect(err.code).toBe('TURNSTILE_FAILED');
    expect(err.httpStatus).toBe(400);
    expect(err.field).toBe('token');
    expect(err.message).toBe('Bot check failed');
  });

  it('field is undefined when not provided', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'Oops', 500);
    expect(err.field).toBeUndefined();
  });
});
