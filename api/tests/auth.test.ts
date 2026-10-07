import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { useTestDatabase } from './helpers/db.js';

useTestDatabase();

const app = createApp();
const credentials = { email: 'admin@example.com', password: 'Str0ng!Passw0rd' };

beforeEach(async () => {
  await User.create({
    name: 'Admin',
    email: credentials.email,
    passwordHash: await bcrypt.hash(credentials.password, 4),
  });
});

async function loginToken() {
  const res = await request(app).post('/api/v1/auth/login').send(credentials);
  return (res.body as { token: string }).token;
}

describe('POST /api/v1/auth/login', () => {
  it('returns a token and the public user for valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      token: expect.any(String),
      expiresAt: expect.any(String),
      user: { name: 'Admin', email: credentials.email, role: 'admin' },
    });
    expect(res.body).not.toHaveProperty('user.passwordHash');
  });

  it('accepts the email case-insensitively', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...credentials, email: 'ADMIN@example.com' });

    expect(res.status).toBe(200);
  });

  it.each([
    ['wrong password', { email: credentials.email, password: 'wrong-password' }],
    ['unknown email', { email: 'nobody@example.com', password: credentials.password }],
  ])('returns the same generic 401 for %s', async (_case, body) => {
    const res = await request(app).post('/api/v1/auth/login').send(body);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ status: 401, detail: 'Invalid email or password' });
  });

  it('returns 400 with field errors for invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
      ]),
    });
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a forged token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.valid-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const token = await loginToken();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: credentials.email, role: 'admin' });
  });
});
