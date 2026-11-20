import { UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { prisma } from '../../src/lib/prisma';
import {
  agent,
  loginAs,
  registerApplicant,
  TEST_PASSWORDS,
  uniqueEmail,
} from '../helpers/fixtures';

const app = createApp();

describe('Auth integration', () => {
  it('registers an applicant account and never returns a password hash', async () => {
    const email = uniqueEmail('register');
    const { response } = await registerApplicant(app, {
      name: 'New Applicant',
      email,
      password: TEST_PASSWORDS.strong,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe(UserRole.APPLICANT);
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(String(response.headers['set-cookie'])).toContain(env.COOKIE_NAME);
    expect(String(response.headers['set-cookie']).toLowerCase()).toContain('httponly');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).toBeTruthy();
    expect(stored.passwordHash).not.toBe(TEST_PASSWORDS.strong);
  });

  it('logs an applicant in and out', async () => {
    const email = uniqueEmail('session');
    await registerApplicant(app, { email, password: TEST_PASSWORDS.strong });

    const { session, response: login } = await loginAs(app, {
      email,
      password: TEST_PASSWORDS.strong,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email);

    const me = await session.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);

    const logout = await session.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const meAfterLogout = await session.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);
  });

  it('rejects duplicate email registration', async () => {
    const email = uniqueEmail('dup');

    const first = await registerApplicant(app, { email });
    expect(first.response.status).toBe(201);

    const duplicate = await registerApplicant(app, {
      name: 'Second User',
      email,
      password: TEST_PASSWORDS.strong,
    });
    expect(duplicate.response.status).toBe(409);
    expect(duplicate.response.body.success).toBe(false);
  });

  it('rejects invalid login credentials', async () => {
    const email = uniqueEmail('bad-login');
    await registerApplicant(app, { email });

    const { response } = await loginAs(app, {
      email,
      password: 'WrongPass9',
    });

    expect(response.status).toBe(401);
  });

  it('rejects public registration when a role is supplied', async () => {
    const response = await agent(app).post('/api/auth/register').send({
      name: 'Role Hacker',
      email: uniqueEmail('role-hack'),
      password: TEST_PASSWORDS.strong,
      role: 'ADMIN',
    });

    expect(response.status).toBe(400);
  });
});
