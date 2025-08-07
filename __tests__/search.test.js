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

  it('optionally includes archived content', async () => {
    await request(app).post('/api/file/archive/notes/archived.md').send({ content: 'archived note' });
    let res = await request(app).get('/api/search').query({ q: 'archived' });
    expect(res.status).toBe(200);
    expect(res.body.results.find(r => r.path.includes('archived.md'))).toBeUndefined();
    res = await request(app).get('/api/search').query({ q: 'archived', includeArchived: '1' });
    expect(res.status).toBe(200);
    expect(res.body.results.find(r => r.path === 'archive/notes/archived.md')).toBeDefined();
  });

  it('returns only latest version by default', async () => {
    await request(app).post('/api/file/notes/versioned.md').send({ content: 'v1 content' });
    await request(app).post('/api/file/notes/versioned.v2.md').send({ content: 'v2 content' });
    const res = await request(app).get('/api/search').query({ q: 'content' });
    expect(res.status).toBe(200);
    const paths = res.body.results.map(r => r.path);
    expect(paths).toContain('notes/versioned.v2.md');
    expect(paths).not.toContain('notes/versioned.md');
  });

  it('can include all versions when requested', async () => {
    const res = await request(app).get('/api/search').query({ q: 'content', versions: 'all' });
    expect(res.status).toBe(200);
    const paths = res.body.results.map(r => r.path);
    expect(paths).toContain('notes/versioned.md');
    expect(paths).toContain('notes/versioned.v2.md');
  });
});
