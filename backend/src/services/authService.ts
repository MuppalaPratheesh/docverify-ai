import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { LoginInput, RegisterInput } from '../validators/authValidators';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { writeAuditLog } from './auditService';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export async function registerApplicant(
  input: RegisterInput,
): Promise<{ user: PublicUser; token: string }> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: UserRole.APPLICANT,
      },
      select: publicUserSelect,
    });

    await writeAuditLog({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return { user, token };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('An account with this email already exists', 409);
    }

    throw error;
  }
}

export async function loginUser(
  input: LoginInput,
): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const token = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  return { user: publicUser, token };
}

export async function logoutUser(userId: string): Promise<void> {
  await writeAuditLog({
    actorId: userId,
    action: 'USER_LOGOUT',
    entityType: 'User',
    entityId: userId,
  });
}

export async function changeUserRole(
  actorId: string,
  targetUserId: string,
  nextRole: UserRole,
): Promise<PublicUser> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: publicUserSelect,
  });

  if (!target) {
    throw new AppError('User not found', 404);
  }

  if (target.role === nextRole) {
    return target;
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: nextRole },
    select: publicUserSelect,
  });

  await writeAuditLog({
    actorId,
    action: 'USER_ROLE_CHANGED',
    entityType: 'User',
    entityId: updated.id,
    metadata: {
      previousRole: target.role,
      nextRole: updated.role,
      email: updated.email,
    },
  });

  return updated;
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
}
