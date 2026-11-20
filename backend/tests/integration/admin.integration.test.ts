import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import {
  loginAs,
  registerApplicant,
  TEST_PASSWORDS,
  uniqueEmail,
} from '../helpers/fixtures';

const app = createApp();

describe('Administration integration', () => {
  it('allows an administrator to update user roles and writes an audit log', async () => {
    const applicantEmail = uniqueEmail('promote');
    const { response: register } = await registerApplicant(app, {
      email: applicantEmail,
      name: 'Soon Reviewer',
    });
    const targetId = register.body.data.user.id as string;

    const { session: admin, response: login } = await loginAs(app, 'admin');
    expect(login.status).toBe(200);
    const adminId = login.body.data.user.id as string;

    const change = await admin
      .patch(`/api/admin/users/${targetId}/role`)
      .send({ role: UserRole.REVIEWER });

    expect(change.status).toBe(200);
    expect(change.body.data.user.role).toBe(UserRole.REVIEWER);
    expect(change.body.data.user.passwordHash).toBeUndefined();

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: targetId } });
    expect(stored.role).toBe(UserRole.REVIEWER);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'USER_ROLE_CHANGED',
        entityId: targetId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(adminId);

    const selfRole = await admin
      .patch(`/api/admin/users/${adminId}/role`)
      .send({ role: UserRole.REVIEWER });
    expect(selfRole.status).toBe(400);
  });

  it('blocks applicants from accessing admin APIs', async () => {
    const email = uniqueEmail('admin-denied');
    await registerApplicant(app, { email });
    const { session } = await loginAs(app, { email, password: TEST_PASSWORDS.strong });

    const dashboard = await session.get('/api/admin/dashboard');
    expect(dashboard.status).toBe(403);

    const users = await session.get('/api/admin/users');
    expect(users.status).toBe(403);

    const roleChange = await session
      .patch('/api/admin/users/someone/role')
      .send({ role: UserRole.ADMIN });
    expect(roleChange.status).toBe(403);
  });

  it('blocks reviewers from accessing admin APIs', async () => {
    const { session } = await loginAs(app, 'reviewer');
    const dashboard = await session.get('/api/admin/dashboard');
    expect(dashboard.status).toBe(403);
  });

  it('lists users without exposing password hashes', async () => {
    const email = uniqueEmail('admin-list');
    await registerApplicant(app, { email });

    const { session: admin } = await loginAs(app, 'admin');
    const users = await admin.get(`/api/admin/users?q=${encodeURIComponent(email)}`);

    expect(users.status).toBe(200);
    expect(users.body.data.users[0].email).toBe(email);
    expect(users.body.data.users[0].passwordHash).toBeUndefined();
    expect(JSON.stringify(users.body).toLowerCase().includes('password')).toBe(false);
  });

  it('supports document type create/update and dashboard totals', async () => {
    const { session: admin } = await loginAs(app, 'admin');

    const code = `TEST_TYPE_${Date.now()}`;
    const createType = await admin.post('/api/admin/document-types').send({
      name: 'Test Degree Certificate',
      code,
      description: 'Synthetic admin test type',
      active: true,
    });
    expect(createType.status).toBe(201);

    const typeId = createType.body.data.documentType.id as string;
    const deactivate = await admin
      .patch(`/api/admin/document-types/${typeId}`)
      .send({ active: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.documentType.active).toBe(false);

    const dashboard = await admin.get('/api/admin/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.applications.total).toBeGreaterThanOrEqual(0);
    expect(dashboard.body.data.users.total).toBeGreaterThan(0);
  });
});
