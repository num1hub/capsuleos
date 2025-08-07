const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const request = require('supertest');
const { createApp } = require('..');

let tmpDir;
let app;
let agent;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'caps-api-'));
  app = createApp(tmpDir);
  agent = request(app);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('create, update, list, versions, restore and delete', async () => {
  // create
  const createRes = await agent
    .post('/api/capsules')
    .send({ title: 'Test', tags: ['t'], payload: { a: 1 } })
    .expect(200);
  const id = createRes.body.id;

  // update
  await agent
    .post('/api/capsules')
    .send({ id, title: 'Test updated', tags: [], payload: {} })
    .expect(200);

  // list
  const listRes = await agent.get('/api/capsules').expect(200);
  expect(listRes.body.length).toBe(1);
  expect(listRes.body[0].title).toBe('Test updated');

  // versions
  const verRes = await agent.get('/api/versions/Test').expect(200);
  expect(verRes.body.versions).toEqual([1, 2]);

  // restore version 1
  await agent.post('/api/restore/Test').send({ version: 1 }).expect(200);
  const verRes2 = await agent.get('/api/versions/Test').expect(200);
  expect(verRes2.body.versions).toEqual([1, 2, 3]);

  // delete
  await agent.delete(`/api/capsules/${id}`).expect(200);
  const listRes2 = await agent.get('/api/capsules').expect(200);
  expect(listRes2.body.length).toBe(0);
});
