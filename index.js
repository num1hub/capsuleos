const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const multer = require('multer');
const { SearchIndexer } = require('./src/search/indexer');

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: path.join(__dirname, 'tmp') });

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('src'));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Data directory setup
const dataPath = path.join(__dirname, 'data');
const searchIndexer = new SearchIndexer(dataPath);

async function initializeDataFolders() {
    const folders = ['notes', 'capsules', 'planner', 'tracker', 'tracker/logs'];
    
    for (const folder of folders) {
        const folderPath = path.join(dataPath, folder);
        try {
            await fs.access(folderPath);
        } catch {
            await fs.mkdir(folderPath, { recursive: true });
            console.log(`Created folder: ${folderPath}`);
        }
    }

    // Initialize habits.json if it doesn't exist
    const habitsPath = path.join(dataPath, 'tracker/habits.json');
    try {
        await fs.access(habitsPath);
    } catch {
        await fs.writeFile(habitsPath, JSON.stringify({ habits: [] }, null, 2));
    }
}

// API Routes
function searchData(query) {
    return searchIndexer.query(query).map(item => ({ path: item.itemId }));
}

app.get('/api/search', (req, res) => {
    try {
        const q = req.query.q || '';
        const results = q ? searchData(q) : [];
        res.json({ results });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
app.get('/api/files/:folder', async (req, res) => {
    try {
        const folder = req.params.folder;
        const fullPath = path.join(dataPath, folder);
        const files = await fs.readdir(fullPath);
        res.json(files);
    } catch (error) {
        console.error('List files error:', error);
        res.json([]);
    }
});

app.get('/api/file/:folder/:filename', async (req, res) => {
    try {
        const { folder, filename } = req.params;
        const filePath = `${folder}/${filename}`;
        const fullPath = path.join(dataPath, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        res.json({ content });
    } catch (error) {
        res.status(404).json({ error: `Failed to read file: ${error.message}` });
    }
});

app.get('/api/file/:folder/:subfolder/:filename', async (req, res) => {
    try {
        const { folder, subfolder, filename } = req.params;
        const filePath = `${folder}/${subfolder}/${filename}`;
        const fullPath = path.join(dataPath, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        res.json({ content });
    } catch (error) {
        res.status(404).json({ error: `Failed to read file: ${error.message}` });
    }
});

app.post('/api/file/:folder/:filename', async (req, res) => {
    try {
        const { folder, filename } = req.params;
        const { content } = req.body;
        const filePath = `${folder}/${filename}`;
        const fullPath = path.join(dataPath, filePath);
        
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(fullPath, content, 'utf8');
        if (searchIndexer) searchIndexer.addFile(fullPath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `Failed to write file: ${error.message}` });
    }
});

app.post('/api/file/:folder/:subfolder/:filename', async (req, res) => {
    try {
        const { folder, subfolder, filename } = req.params;
        const { content } = req.body;
        const filePath = `${folder}/${subfolder}/${filename}`;
        const fullPath = path.join(dataPath, filePath);
        
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(fullPath, content, 'utf8');
        if (searchIndexer) searchIndexer.addFile(fullPath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `Failed to write file: ${error.message}` });
    }
});

app.delete('/api/file/:folder/:filename', async (req, res) => {
    try {
        const { folder, filename } = req.params;
        const filePath = `${folder}/${filename}`;
        const fullPath = path.join(dataPath, filePath);
        await fs.unlink(fullPath);
        if (searchIndexer) searchIndexer.removeFile(fullPath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `Failed to delete file: ${error.message}` });
    }
});

app.delete('/api/file/:folder/:subfolder/:filename', async (req, res) => {
    try {
        const { folder, subfolder, filename } = req.params;
        const filePath = `${folder}/${subfolder}/${filename}`;
        const fullPath = path.join(dataPath, filePath);
        await fs.unlink(fullPath);
        if (searchIndexer) searchIndexer.removeFile(fullPath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `Failed to delete file: ${error.message}` });
    }
});

// Export data as ZIP
app.post('/api/export', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="data.zip"');
        const archive = archiver('zip');
        archive.on('error', err => {
            throw err;
        });
        archive.pipe(res);
        archive.directory(dataPath, false);
        await archive.finalize();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Import data from ZIP
app.post('/api/import', upload.single('file'), async (req, res) => {
    try {
        const zip = new AdmZip(req.file.path);
        const entries = zip.getEntries();
        for (const entry of entries) {
            if (entry.isDirectory) continue;
            const entryPath = entry.entryName;
            let destPath = path.join(dataPath, entryPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            // collision-safe merge
            let counter = 1;
            while (true) {
                try {
                    await fs.access(destPath);
                    const parsed = path.parse(destPath);
                    destPath = path.join(parsed.dir, `${parsed.name}_import${counter}${parsed.ext}`);
                    counter++;
                } catch {
                    break;
                }
            }
            await fs.writeFile(destPath, entry.getData());
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Import failed' });
    } finally {
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

async function startServer() {
    try {
        await initializeDataFolders();
        searchIndexer.buildIndex();

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`CapsuleOS v0.0.5 Server running on http://0.0.0.0:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };