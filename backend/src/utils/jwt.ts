import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded !== 'object' || decoded === null) {
      throw new AppError('Invalid authentication token', 401);
    }

    const { sub, role, email } = decoded as Partial<AccessTokenPayload>;

    if (!sub || !role || !email) {
      throw new AppError('Invalid authentication token', 401);
    }

    return { sub, role, email };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired authentication token', 401);
  }
}
