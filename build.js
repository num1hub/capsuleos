const { build } = require('electron-builder');

build().catch(err => {
  console.error(err);
  process.exit(1);
});
