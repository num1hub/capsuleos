const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('..');

describe('Search API', () => {
  const dataDir = path.join(__dirname, '..', 'data', 'notes');
  beforeAll(async () => {
    await fs.mkdir(dataDir, { recursive: true });
  });

  it('returns results for query', async () => {
    await request(app).post('/api/file/notes/test.md').send({ content: 'hello world' });
    const res = await request(app).get('/api/search').query({ q: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});
