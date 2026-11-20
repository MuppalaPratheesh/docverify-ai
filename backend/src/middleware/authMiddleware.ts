import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token || typeof token !== 'string') {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: publicUserSelect,
    });

    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    if (user.role !== payload.role || user.email !== payload.email) {
      throw new AppError('Authentication token is no longer valid', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action', 403));
      return;
    }

    next();
  };
}
