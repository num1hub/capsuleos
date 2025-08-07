const Fuse = require('fuse.js');
const { readdirSync, readFileSync, statSync, watch, mkdirSync } = require('fs');
const { join, extname, relative, dirname } = require('path');
const { parseFilename } = require('../lib/version');

function stripMd(text) {
  return text.replace(/[\#\*`>_\-\[\]\(\)!]/g, ' ');
}

class SearchIndexer {
  constructor(root) {
    this.root = root;
    mkdirSync(this.root, { recursive: true });
    this.items = [];
    this.fuse = new Fuse(this.items, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'tags', weight: 0.2 },
        { name: 'body', weight: 0.1 }
      ],
      threshold: 0.35,
      ignoreLocation: true
    });
    this.buildIndex();
    if (process.env.NODE_ENV !== 'test') {
      this.watch();
    }
  }

  buildIndex() {
    this.items = [];
    this.latest = {};
    const files = this.walk(this.root);
    for (const file of files) {
      const item = this.makeItem(file);
      if (item) {
        this.items.push(item);
        const lv = this.latest[item.basePath] || 0;
        if (item.version > lv) this.latest[item.basePath] = item.version;
      }
    }
    this.fuse.setCollection(this.items);
  }

  walk(dir) {
    let results = [];
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch { return results; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(this.walk(full));
      } else if ([ '.md', '.json' ].includes(extname(full))) {
        results.push(full);
      }
    }
    return results;
  }

  makeItem(fullPath) {
    try {
      const relPath = relative(this.root, fullPath).split('\\').join('/');
      const module = relPath.split('/')[0] || '';
      const { base, version, ext } = parseFilename(fullPath);
      const title = base;
      const dir = dirname(relPath);
      const basePath = (dir ? dir + '/' : '') + `${base}${ext}`;
      let body = readFileSync(fullPath, 'utf8');
      let tags = [];
      if (ext === '.md') {
        body = stripMd(body);
      } else {
        try {
          const json = JSON.parse(body);
          if (Array.isArray(json.tags)) tags = json.tags;
          body = JSON.stringify(json);
        } catch {}
      }
      return {
        itemId: relPath,
        module,
        title,
        body,
        tags,
        isArchived: relPath.startsWith('archive/'),
        version,
        basePath
      };
    } catch {
      return null;
    }
  }

  addFile(fullPath) {
    const item = this.makeItem(fullPath);
    if (!item) return;
    const idx = this.items.findIndex(i => i.itemId === item.itemId);
    if (idx >= 0) this.items[idx] = item; else this.items.push(item);
    const lv = this.latest[item.basePath] || 0;
    if (item.version > lv) this.latest[item.basePath] = item.version;
    this.fuse.setCollection(this.items);
  }

  removeFile(fullPath) {
    const relPath = relative(this.root, fullPath).split('\\').join('/');
    let removed;
    this.items = this.items.filter(i => {
      if (i.itemId === relPath) { removed = i; return false; }
      return true;
    });
    if (removed) {
      const lv = Math.max(0, ...this.items.filter(i => i.basePath === removed.basePath).map(i => i.version));
      if (lv === 0) delete this.latest[removed.basePath]; else this.latest[removed.basePath] = lv;
    }
    this.fuse.setCollection(this.items);
  }

  query(q, opts = {}) {
    const res = this.fuse.search(q, { limit: opts.limit || 20 });
    return res
      .map(r => r.item)
      .filter(item => (opts.includeArchived || !item.isArchived))
      .filter(item => {
        if (opts.versions === 'all') return true;
        const lv = this.latest[item.basePath] || 1;
        return item.version === lv;
      });
  }

  watch() {
    const debounce = new Map();
    const watcher = watch(this.root, { recursive: true }, (_evt, filename) => {
      if (!filename || !filename.match(/\.(md|json)$/)) return;
      if (debounce.has(filename)) clearTimeout(debounce.get(filename));
      const t = setTimeout(() => {
        const full = join(this.root, filename);
        try {
          statSync(full);
          this.addFile(full);
        } catch {
          this.removeFile(full);
        }
        debounce.delete(filename);
      }, 250);
      if (t.unref) t.unref();
      debounce.set(filename, t);
    });
    if (watcher && watcher.unref) watcher.unref();
  }
}

module.exports = { SearchIndexer };
