const { parseFilename, buildFilename } = require('../lib/version');

test('parse filename without version', () => {
  expect(parseFilename('Idea.json')).toEqual({ base: 'Idea', version: 1, ext: '.json' });
});

test('parse filename with version', () => {
  expect(parseFilename('Idea.v2.json')).toEqual({ base: 'Idea', version: 2, ext: '.json' });
});

test('build filename', () => {
  expect(buildFilename('Idea', 1, '.json')).toBe('Idea.json');
  expect(buildFilename('Idea', 3, '.json')).toBe('Idea.v3.json');
});
