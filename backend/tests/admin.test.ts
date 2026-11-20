import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;
}

describe('Administration APIs', () => {
  const createdEmails: string[] = [];
  const createdDocumentTypeIds: string[] = [];
  const createdRuleIds: string[] = [];
  const createdSourceIds: string[] = [];

  afterAll(async () => {
    if (createdRuleIds.length > 0) {
      await prisma.verificationRule.deleteMany({ where: { id: { in: createdRuleIds } } });
    }
    if (createdDocumentTypeIds.length > 0) {
      await prisma.documentType.deleteMany({ where: { id: { in: createdDocumentTypeIds } } });
    }
    if (createdSourceIds.length > 0) {
      await prisma.referenceSource.deleteMany({ where: { id: { in: createdSourceIds } } });
    }

    if (createdEmails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: createdEmails } },
        select: { id: true },
      });
      const ids = users.map((user) => user.id);
      if (ids.length > 0) {
        await prisma.auditLog.deleteMany({
          where: {
            OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }],
          },
        });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    }

    await prisma.$disconnect();
  });

  it('restricts admin APIs and supports catalog/user management without exposing passwords', async () => {
    const applicantEmail = uniqueEmail('admin-applicant');
    createdEmails.push(applicantEmail);

    const applicant = request.agent(app);
    await applicant.post('/api/auth/register').send({
      name: 'Admin Panel Applicant',
      email: applicantEmail,
      password: 'SecurePass1',
    });

    const denied = await applicant.get('/api/admin/dashboard');
    expect(denied.status).toBe(403);

    const admin = request.agent(app);
    const login = await admin.post('/api/auth/login').send({
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.local',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'DevAdminPass123!',
    });
    expect(login.status).toBe(200);
    const adminId = login.body.data.user.id as string;

    const dashboard = await admin.get('/api/admin/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.applications.total).toBeGreaterThanOrEqual(0);
    expect(dashboard.body.data.users.total).toBeGreaterThan(0);

    const users = await admin.get(`/api/admin/users?q=${encodeURIComponent(applicantEmail)}`);
    expect(users.status).toBe(200);
    expect(users.body.data.users[0].email).toBe(applicantEmail);
    expect(users.body.data.users[0].passwordHash).toBeUndefined();

    const targetId = users.body.data.users[0].id as string;
    const roleChange = await admin
      .patch(`/api/admin/users/${targetId}/role`)
      .send({ role: UserRole.REVIEWER });
    expect(roleChange.status).toBe(200);
    expect(roleChange.body.data.user.role).toBe(UserRole.REVIEWER);

    const selfRole = await admin
      .patch(`/api/admin/users/${adminId}/role`)
      .send({ role: UserRole.REVIEWER });
    expect(selfRole.status).toBe(400);

    const code = `TEST_TYPE_${Date.now()}`;
    const createType = await admin.post('/api/admin/document-types').send({
      name: 'Test Degree Certificate',
      code,
      description: 'Synthetic admin test type',
      active: true,
    });
    expect(createType.status).toBe(201);
    const typeId = createType.body.data.documentType.id as string;
    createdDocumentTypeIds.push(typeId);

    const deactivate = await admin
      .patch(`/api/admin/document-types/${typeId}`)
      .send({ active: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.documentType.active).toBe(false);

    const createRule = await admin.post('/api/admin/verification-rules').send({
      title: 'Manual completeness check',
      description: 'Ensure required fields are present',
      documentTypeId: typeId,
      effectiveDate: new Date().toISOString(),
      isActive: true,
    });
    expect(createRule.status).toBe(201);
    createdRuleIds.push(createRule.body.data.rule.id);

    const sourceVersion = `v${Date.now()}`;
    const createSource = await admin.post('/api/admin/reference-sources').send({
      title: 'Admin Test Reference',
      version: sourceVersion,
      effectiveDate: new Date().toISOString(),
      sourceDescription: 'Synthetic reference metadata',
    });
    expect(createSource.status).toBe(201);
    createdSourceIds.push(createSource.body.data.source.id);

    const audit = await admin.get('/api/admin/audit-logs?q=DOCUMENT_TYPE');
    expect(audit.status).toBe(200);
    expect(audit.body.data.auditLogs.length).toBeGreaterThan(0);
    expect(
      JSON.stringify(audit.body.data.auditLogs).toLowerCase().includes('password'),
    ).toBe(false);
  });
});
