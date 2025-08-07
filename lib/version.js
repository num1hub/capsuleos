const path = require('path');

function parseFilename(filePath) {
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const match = name.match(/^(.*)\.v(\d+)$/);
  if (match) {
    return { base: match[1], version: Number(match[2]), ext };
  }
  return { base: name, version: 1, ext };
}

function buildFilename(base, version, ext = '.json') {
  return version > 1 ? `${base}.v${version}${ext}` : `${base}${ext}`;
}

module.exports = { parseFilename, buildFilename };
