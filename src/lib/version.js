const path = require('path');

function parseFilename(filePath) {
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const match = name.match(/^(.*)\.v(\d+)$/);
  if (match) {
    return { base: match[1], version: parseInt(match[2], 10), ext };
  }
  return { base: name, version: 1, ext };
}

function buildFilename(base, version, ext) {
  if (!ext.startsWith('.')) ext = `.${ext}`;
  if (version && version > 1) {
    return `${base}.v${version}${ext}`;
  }
  return `${base}${ext}`;
}

module.exports = { parseFilename, buildFilename };
