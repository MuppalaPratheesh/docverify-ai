import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/health', () => {
  it('returns a healthy response', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.service).toBe('docverify-ai-backend');
  });
});
