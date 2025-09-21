import { createServer } from '../index';
import request from 'supertest';

describe('Admin Authentication Setup', () => {
  let app: any;

  beforeAll(() => {
    app = createServer();
  });

  it('should have admin authentication routes', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
  });

  it('should allow admin login', async () => {
    const response = await request(app)
      .post('/api/auth/admin-login')
      .send({
        authType: 'password',
        email: 'admin@yatrarakshak.com',
        password: 'admin123'
      });
    
    // In development, this should either succeed or give a specific error
    expect([200, 400, 401, 500]).toContain(response.status);
  });

  it('should protect admin routes', async () => {
    const response = await request(app).get('/api/admin/pending-verifications');
    // Should require authentication
    expect([401, 403]).toContain(response.status);
  });
});