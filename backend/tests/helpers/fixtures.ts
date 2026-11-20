import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';

export const TEST_PASSWORDS = {
  admin: process.env.SEED_ADMIN_PASSWORD ?? 'TestAdminPass123!',
  reviewer: process.env.SEED_REVIEWER_PASSWORD ?? 'TestReviewerPass123!',
  applicant: process.env.SEED_APPLICANT_PASSWORD ?? 'TestApplicantPass123!',
  strong: 'SecurePass1',
} as const;

export const TEST_EMAILS = {
  admin: process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.test',
  reviewer: process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@docverify.test',
  applicant: process.env.SEED_APPLICANT_EMAIL ?? 'applicant@docverify.test',
} as const;

let emailCounter = 0;

export function uniqueEmail(prefix: string): string {
  emailCounter += 1;
  return `${prefix}.${Date.now()}.${emailCounter}@example.test`;
}

export function agent(app: Express) {
  return request.agent(app);
}

export async function registerApplicant(
  app: Express,
  overrides?: { name?: string; email?: string; password?: string },
) {
  const email = overrides?.email ?? uniqueEmail('applicant');
  const password = overrides?.password ?? TEST_PASSWORDS.strong;
  const name = overrides?.name ?? 'Synthetic Applicant';

  const response = await agent(app).post('/api/auth/register').send({
    name,
    email,
    password,
  });

  return { response, email, password, name };
}

export async function loginAs(
  app: Express,
  role: 'admin' | 'reviewer' | 'applicant' | { email: string; password: string },
) {
  const credentials =
    typeof role === 'string'
      ? { email: TEST_EMAILS[role], password: TEST_PASSWORDS[role] }
      : role;

  const session = agent(app);
  const response = await session.post('/api/auth/login').send(credentials);
  return { session, response, ...credentials };
}

export async function getActiveDocumentType(code: 'TRANSCRIPT' | 'LANGUAGE_CERTIFICATE') {
  return prisma.documentType.findUniqueOrThrow({
    where: { code },
  });
}

export function authUser(
  id: string,
  role: UserRole,
  email = 'user@example.test',
) {
  return {
    id,
    name: 'Auth User',
    email,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
