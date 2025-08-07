const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const request = require('supertest');
const { createApp } = require('..');

let tmpDir;
let agent;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'caps-search-'));
  agent = request(createApp(tmpDir));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('search respects archive and version options', async () => {
  // create capsule and update to create two versions
  const res = await agent.post('/api/capsules').send({ title: 'Alpha', tags: [], payload: {} });
  const id = res.body.id;
  await agent.post('/api/capsules').send({ id, title: 'Alpha', tags: [], payload: {} });

  // archived capsule
  await agent.post('/api/capsules').send({ title: 'Beta', tags: [], payload: {}, archived: true });

  // default search returns latest non-archived
  let s = await agent.get('/api/search').query({ q: 'Alpha' });
  expect(s.body.results.length).toBe(1);
  expect(s.body.results[0].version).toBe(2);

  // include archived
  s = await agent.get('/api/search').query({ q: 'Beta', includeArchived: true });
  expect(s.body.results.length).toBe(1);

  // versions all
  s = await agent.get('/api/search').query({ q: 'Alpha', versions: 'all' });
  expect(s.body.results.length).toBe(2);
});
