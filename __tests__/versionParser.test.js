const { parseFilename, buildFilename } = require('../src/lib/version');

describe('Version parser utility', () => {
  test('parses filename without version as v1', () => {
    const res = parseFilename('notes/test.md');
    expect(res).toEqual({ base: 'test', version: 1, ext: '.md' });
  });

  test('parses filename with version', () => {
    const res = parseFilename('notes/test.v3.md');
    expect(res).toEqual({ base: 'test', version: 3, ext: '.md' });
  });

  test('builds filename correctly', () => {
    expect(buildFilename('test', 1, '.md')).toBe('test.md');
    expect(buildFilename('test', 2, '.md')).toBe('test.v2.md');
  });
});
