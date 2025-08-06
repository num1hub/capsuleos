const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('..');

function binaryParser(res, callback) {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', function (chunk) { res.data += chunk; });
  res.on('end', function () { callback(null, Buffer.from(res.data, 'binary')); });
}

describe('Export API', () => {
  const dataDir = path.join(__dirname, '..', 'data', 'notes');
  beforeAll(async () => {
    await fs.mkdir(dataDir, { recursive: true });
  });

  it('returns zip', async () => {
    const res = await request(app).post('/api/export').buffer(true).parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
  });
});
