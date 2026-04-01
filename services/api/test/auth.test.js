const request = require('supertest');
const express = require('express');

// Mock database for testing
jest.mock('./models/db', () => ({
  query: jest.fn(),
  createWorker: jest.fn(),
  getWorker: jest.fn(),
}));

const app = require('./server');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new worker successfully', async () => {
      const mockWorker = {
        worker_id: 'w-test-123',
        name: 'Test Worker',
        phone: '9999999999',
        platform: 'ZOMATO',
        zone_id: 'zone_01'
      };

      // Mock database responses
      require('./models/db').query
        .mockResolvedValueOnce({ rows: [] }) // Phone check
        .mockResolvedValueOnce({ rows: [{ zone_id: 'zone_01' }] }); // Zone check
      require('./models/db').createWorker.mockResolvedValue({ rows: [mockWorker] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phone: '9999999999',
          name: 'Test Worker',
          platform: 'ZOMATO',
          zone_id: 'zone_01'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('worker_id');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject duplicate phone numbers', async () => {
      require('./models/db').query.mockResolvedValue({ rows: [{ worker_id: 'existing' }] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phone: '9999999999',
          name: 'Test Worker',
          platform: 'ZOMATO',
          zone_id: 'zone_01'
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('PHONE_EXISTS');
    });
  });

  describe('POST /api/auth/admin-login', () => {
    it('should login admin successfully', async () => {
      const mockAdmin = {
        admin_id: 'admin-001',
        name: 'Admin User',
        email: 'admin@gigcare.com',
        phone: '9876543210',
        role: 'ADMIN',
        permissions: ['read', 'write', 'admin']
      };

      require('./models/db').query.mockResolvedValue({ rows: [mockAdmin] });

      const response = await request(app)
        .post('/api/auth/admin-login')
        .send({
          phone: '9876543210',
          otp: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('admin_id');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.role).toBe('ADMIN');
    });

    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/admin-login')
        .send({
          phone: '9876543210',
          otp: 'wrong'
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_OTP');
    });
  });
});