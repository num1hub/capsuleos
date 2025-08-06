const Fuse = require('fuse.js');
const { readdirSync, readFileSync, statSync, watch, mkdirSync } = require('fs');
const { join, extname, basename, relative } = require('path');

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
    const files = this.walk(this.root);
    for (const file of files) {
      const item = this.makeItem(file);
      if (item) this.items.push(item);
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
      const ext = extname(fullPath);
      const base = basename(fullPath, ext);
      const versionMatch = base.match(/\.v(\d+)$/);
      const version = versionMatch ? parseInt(versionMatch[1], 10) : 1;
      const title = versionMatch ? base.replace(/\.v\d+$/, '') : base;
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
        version
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
    this.fuse.setCollection(this.items);
  }

  removeFile(fullPath) {
    const relPath = relative(this.root, fullPath).split('\\').join('/');
    this.items = this.items.filter(i => i.itemId !== relPath);
    this.fuse.setCollection(this.items);
  }

  query(q, opts = {}) {
    const res = this.fuse.search(q, { limit: opts.limit || 20 });
    return res
      .map(r => r.item)
      .filter(item => (opts.includeArchived || !item.isArchived))
      .filter(item => (opts.versions === 'all' ? true : item.version === 1));
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
