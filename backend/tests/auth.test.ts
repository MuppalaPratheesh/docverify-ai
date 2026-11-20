import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { env } from '../src/config/env';

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;
}

describe('Authentication API', () => {
  const createdEmails: string[] = [];

  afterAll(async () => {
    if (createdEmails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: createdEmails } },
        select: { id: true },
      });
      const ids = users.map((user) => user.id);

      if (ids.length > 0) {
        await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
        await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    }

    await prisma.$disconnect();
  });

  it('registers an applicant account and sets an HttpOnly auth cookie', async () => {
    const email = uniqueEmail('register');
    createdEmails.push(email);

    const response = await request(app).post('/api/auth/register').send({
      name: 'New Applicant',
      email,
      password: 'SecurePass1',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe(UserRole.APPLICANT);
    expect(response.body.data.user.passwordHash).toBeUndefined();

    const cookie = response.headers['set-cookie'];
    expect(cookie).toBeDefined();
    expect(String(cookie)).toContain(env.COOKIE_NAME);
    expect(String(cookie).toLowerCase()).toContain('httponly');

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'USER_REGISTERED', entityType: 'User' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects public registration when a role is supplied', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Role Hacker',
        email: uniqueEmail('role-hack'),
        password: 'SecurePass1',
        role: 'ADMIN',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects weak passwords and duplicate emails', async () => {
    const email = uniqueEmail('dup');
    createdEmails.push(email);

    const weak = await request(app).post('/api/auth/register').send({
      name: 'Weak Password',
      email,
      password: 'weak',
    });
    expect(weak.status).toBe(400);

    const first = await request(app).post('/api/auth/register').send({
      name: 'First User',
      email,
      password: 'SecurePass1',
    });
    expect(first.status).toBe(201);

    const duplicate = await request(app).post('/api/auth/register').send({
      name: 'Second User',
      email,
      password: 'SecurePass1',
    });
    expect(duplicate.status).toBe(409);
  });

  it('logs in, restores session via /me, and logs out', async () => {
    const email = uniqueEmail('session');
    createdEmails.push(email);
    const password = 'SecurePass1';

    await request(app).post('/api/auth/register').send({
      name: 'Session User',
      email,
      password,
    });

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email);

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password });

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const meAfterLogout = await agent.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);

    const loginAudit = await prisma.auditLog.findFirst({
      where: { action: 'USER_LOGIN', entityType: 'User' },
      orderBy: { createdAt: 'desc' },
    });
    const logoutAudit = await prisma.auditLog.findFirst({
      where: { action: 'USER_LOGOUT', entityType: 'User' },
      orderBy: { createdAt: 'desc' },
    });
    expect(loginAudit).not.toBeNull();
    expect(logoutAudit).not.toBeNull();
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const me = await request(app).get('/api/auth/me');
    expect(me.status).toBe(401);

    const logout = await request(app).post('/api/auth/logout');
    expect(logout.status).toBe(401);

    const admin = await request(app)
      .patch('/api/admin/users/nonexistent/role')
      .send({ role: 'REVIEWER' });
    expect(admin.status).toBe(401);
  });

  it('allows ADMIN to change roles and writes an audit log', async () => {
    const applicantEmail = uniqueEmail('promote');
    createdEmails.push(applicantEmail);

    const register = await request(app).post('/api/auth/register').send({
      name: 'Soon Reviewer',
      email: applicantEmail,
      password: 'SecurePass1',
    });
    const applicantId = register.body.data.user.id as string;

    const adminLogin = await request.agent(app).post('/api/auth/login').send({
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.local',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'DevAdminPass123!',
    });
    expect(adminLogin.status).toBe(200);

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.local',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'DevAdminPass123!',
    });

    const change = await agent
      .patch(`/api/admin/users/${applicantId}/role`)
      .send({ role: UserRole.REVIEWER });

    expect(change.status).toBe(200);
    expect(change.body.data.user.role).toBe(UserRole.REVIEWER);

    const roleAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'USER_ROLE_CHANGED',
        entityId: applicantId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(roleAudit).not.toBeNull();

    // Applicants cannot access admin role changes.
    const applicantAgent = request.agent(app);
    await applicantAgent.post('/api/auth/login').send({
      email: applicantEmail,
      password: 'SecurePass1',
    });
    const forbidden = await applicantAgent
      .patch(`/api/admin/users/${applicantId}/role`)
      .send({ role: UserRole.ADMIN });
    expect(forbidden.status).toBe(403);
  });
});
