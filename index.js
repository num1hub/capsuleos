const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const Fuse = require('fuse.js');
const multer = require('multer');
const Archiver = require('archiver');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { parseFilename, buildFilename } = require('./lib/version');

const DEFAULT_PORT = 5000;
const DEFAULT_DATA_DIR = path.join(__dirname, 'data', 'capsules');

function slugify(str) {
  return str.replace(/[\\/]/g, '-').replace(/\s+/g, ' ').trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readCapsuleFiles(dir) {
  const files = await fs.readdir(dir).catch(() => []);
  const capsules = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const full = path.join(dir, file);
    const data = JSON.parse(await fs.readFile(full, 'utf8'));
    const parsed = parseFilename(file);
    capsules.push({ file: full, base: parsed.base, version: parsed.version, data });
  }
  return capsules;
}

async function listLatestCapsules(dir) {
  const all = await readCapsuleFiles(dir);
  const map = {};
  for (const c of all) {
    const cur = map[c.base];
    if (!cur || c.version > cur.version) map[c.base] = c;
  }
  return Object.values(map);
}

function createApp(dataDir) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'src')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
  });

  // list capsules
  app.get('/api/capsules', async (req, res) => {
    const latest = await listLatestCapsules(dataDir);
    res.json(latest.filter(c => !c.data.archived).map(c => c.data));
  });

  // get capsule by id
  app.get('/api/capsules/:id', async (req, res) => {
    const all = await readCapsuleFiles(dataDir);
    const matches = all.filter(c => c.data.id === req.params.id);
    if (!matches.length) return res.status(404).json({ error: 'Not found' });
    const latest = matches.reduce((a, b) => (b.version > a.version ? b : a));
    res.json(latest.data);
  });

  // create or update
  app.post('/api/capsules', async (req, res) => {
    const { id, title, tags = [], payload = {}, archived = false } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const all = await readCapsuleFiles(dataDir);
    if (id) {
      const matches = all.filter(c => c.data.id === id);
      if (!matches.length) return res.status(404).json({ error: 'Not found' });
      const latest = matches.reduce((a, b) => (b.version > a.version ? b : a));
      const base = latest.base;
      if (latest.version === 1 && path.basename(latest.file) === buildFilename(base, 1)) {
        const v1name = path.join(dataDir, `${base}.v1.json`);
        await fs.rename(latest.file, v1name);
      }
      const newVersion = latest.version + 1;
      const newFile = path.join(dataDir, buildFilename(base, newVersion));
      const newData = { id, title, tags, payload, archived };
      await fs.writeFile(newFile, JSON.stringify(newData, null, 2));
      res.json(newData);
    } else {
      const newId = uuidv4();
      const base = slugify(title);
      const file = path.join(dataDir, buildFilename(base, 1));
      const data = { id: newId, title, tags, payload, archived };
      await fs.writeFile(file, JSON.stringify(data, null, 2));
      res.json(data);
    }
  });

  // delete
  app.delete('/api/capsules/:id', async (req, res) => {
    const all = await readCapsuleFiles(dataDir);
    const matches = all.filter(c => c.data.id === req.params.id);
    if (!matches.length) return res.status(404).json({ error: 'Not found' });
    const base = matches[0].base;
    const files = await fs.readdir(dataDir);
    await Promise.all(
      files.filter(f => f.startsWith(base)).map(f => fs.unlink(path.join(dataDir, f)))
    );
    res.json({ ok: true });
  });

  // search
  app.get('/api/search', async (req, res) => {
    const q = req.query.q || '';
    const includeArchived = req.query.includeArchived === 'true';
    const versions = req.query.versions === 'all';
    let items = await readCapsuleFiles(dataDir);
    if (!includeArchived) items = items.filter(c => !c.data.archived);
    if (!versions) {
      const map = {};
      for (const c of items) {
        const cur = map[c.base];
        if (!cur || c.version > cur.version) map[c.base] = c;
      }
      items = Object.values(map);
    }
    const fuse = new Fuse(
      items.map(c => ({ ...c.data, _version: c.version })),
      { keys: ['title', 'tags', 'payload'], includeScore: true }
    );
    const results = fuse.search(q).map(r => ({
      id: r.item.id,
      title: r.item.title,
      version: r.item._version,
      archived: r.item.archived
    }));
    res.json({ results });
  });

  // versions
  app.get('/api/versions/:base', async (req, res) => {
    const files = await fs.readdir(dataDir);
    const versions = files
      .filter(f => parseFilename(f).base === req.params.base)
      .map(f => parseFilename(f).version)
      .sort((a, b) => a - b);
    res.json({ versions });
  });

  // restore
  app.post('/api/restore/:base', async (req, res) => {
    const { version } = req.body;
    let targetPath = path.join(dataDir, buildFilename(req.params.base, version));
    try {
      await fs.access(targetPath);
    } catch {
      if (version === 1) {
        const alt = path.join(dataDir, `${req.params.base}.v1.json`);
        try {
          await fs.access(alt);
          targetPath = alt;
        } catch {
          return res.status(404).json({ error: 'Version not found' });
        }
      } else {
        return res.status(404).json({ error: 'Version not found' });
      }
    }

    const data = await fs.readFile(targetPath, 'utf8');
    const items = await fs.readdir(dataDir);
    const next = Math.max(
      ...items
        .filter(f => parseFilename(f).base === req.params.base)
        .map(f => parseFilename(f).version)
    ) + 1;
    const newFile = path.join(dataDir, buildFilename(req.params.base, next));
    await fs.writeFile(newFile, data);
    res.json({ ok: true, version: next });
  });

  // export
  app.post('/api/export', async (req, res) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="capsules_backup.zip"');
    const archive = Archiver('zip');
    archive.on('error', err => res.status(500).end(err.message));
    archive.pipe(res);
    archive.directory(path.join(__dirname, 'data/'), false);
    archive.finalize();
  });

  // import
  const upload = multer({ dest: path.join(__dirname, 'tmp') });
  app.post('/api/import', upload.single('file'), async (req, res) => {
    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const parsed = path.parse(entry.entryName);
      let filename = parsed.base;
      let dest = path.join(dataDir, filename);
      let i = 1;
      while (true) {
        try {
          await fs.access(dest);
          filename = `${parsed.name}_import${i}${parsed.ext}`;
          dest = path.join(dataDir, filename);
          i++;
        } catch {
          break;
        }
      }
      await fs.writeFile(dest, entry.getData());
    }
    await fs.unlink(req.file.path);
    res.json({ ok: true });
  });

  return app;
}

async function startServer(port = DEFAULT_PORT, dataDir = DEFAULT_DATA_DIR) {
  await ensureDir(dataDir);
  const app = createApp(dataDir);
  return app.listen(port, () => {
    console.log(`CapsuleOS v0.0.1 running on port ${port}`);
  });
}

if (require.main === module && !process.versions.electron) {
  startServer();
}

// Electron integration
if (process.versions.electron) {
  const { app: electronApp, BrowserWindow } = require('electron');
  electronApp.whenReady().then(async () => {
    await startServer();
    const win = new BrowserWindow({ width: 1000, height: 700 });
    win.loadURL(`http://localhost:${DEFAULT_PORT}`);
  });
}

module.exports = { createApp, startServer };
