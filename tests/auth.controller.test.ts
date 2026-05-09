import request from 'supertest';
import app from '../src/app';
import { blacklistRepository } from '../src/repositories/BlacklistRepository';
import { createUser } from './helpers/factories';
import { mockAdjutorBlacklisted, mockAdjutorClean, mockAdjutorFailure } from './mocks/adjutor';

describe('AuthController - Registration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a new user successfully', async () => {
    mockAdjutorClean();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser@example.com',
        password: 'Password123',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('testuser@example.com');
  });

  it('blocks registration if user is blacklisted in database', async () => {
    await blacklistRepository.create({
      email: 'blacklisted@example.com',
      raw_response: JSON.stringify({ is_blacklisted: true }),
    });
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Black',
        last_name: 'Listed',
        email: 'blacklisted@example.com',
        password: 'Password123',
      });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/blacklist/i);
  });

  it('blocks registration when Adjutor marks user as blacklisted', async () => {
    mockAdjutorBlacklisted();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Black',
        last_name: 'Listed',
        email: 'adjutor-blacklisted@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/blacklist/i);
  });

  it('allows registration if Adjutor check fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockAdjutorFailure();

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Fallback',
        last_name: 'Allowed',
        email: 'adjutor-fail@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('fails registration if email already exists', async () => {
    mockAdjutorClean();
    await createUser({ email: 'duplicate@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Duplicate',
        last_name: 'User',
        email: 'duplicate@example.com',
        password: 'Password123',
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('fails if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'missing@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('AuthController - Login', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs in successfully with correct credentials', async () => {
    await createUser({ email: 'login-ok@example.com', password: 'Password123' });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login-ok@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('fails login with wrong password', async () => {
    await createUser({ email: 'wrong-pass@example.com', password: 'Password123' });

    const res = await request(app).post('/api/auth/login').send({
      email: 'wrong-pass@example.com',
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails login if user is inactive', async () => {
    await createUser({
      email: 'inactive@example.com',
      password: 'Password123',
      is_active: false,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'inactive@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
