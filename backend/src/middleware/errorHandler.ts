import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'ZodError' &&
    'issues' in err
  ) {
    statusCode = 400;
    const issues = (err as { issues: Array<{ message: string }> }).issues;
    message = issues.map((issue) => issue.message).join('; ') || 'Invalid request';
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
  ) {
    statusCode = 400;
    message = 'File exceeds the maximum allowed size of 10 MB';
  }

  if (env.NODE_ENV !== 'production' && statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(env.NODE_ENV !== 'production' &&
      err instanceof Error &&
      statusCode >= 500
        ? { stack: err.stack }
        : {}),
    },
  });
}
