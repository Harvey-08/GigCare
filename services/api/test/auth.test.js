const request = require('supertest');

jest.mock('./models/db', () => ({
  getProfileByEmailOrPhone: jest.fn(),
  getProfileByEmail: jest.fn(),
  createProfile: jest.fn(),
}));

const app = require('./server');
const db = require('./models/db');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should send an OTP to a new registration email', async () => {
      db.getProfileByEmailOrPhone.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'worker@example.com',
          name: 'Test Worker',
          phone: '9999999999',
          platform: 'ZOMATO',
          zone_id: 'zone_01',
          latitude: 12.97,
          longitude: 77.59,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ email: 'worker@example.com' });
      expect(response.body.message).toMatch(/OTP sent/);
    });

    it('should reject duplicate registration emails or phone numbers', async () => {
      db.getProfileByEmailOrPhone.mockResolvedValue({ id: 'existing-id' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'worker@example.com',
          name: 'Test Worker',
          phone: '9999999999',
          platform: 'ZOMATO',
          zone_id: 'zone_01',
          latitude: 12.97,
          longitude: 77.59,
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should send an OTP when the user exists', async () => {
      db.getProfileByEmail.mockResolvedValue({ id: 'user-1', email: 'worker@example.com' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'worker@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ email: 'worker@example.com' });
      expect(response.body.message).toMatch(/OTP sent/);
    });

    it('should reject an unknown email address', async () => {
      db.getProfileByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });
  });
});
