const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 5000;

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
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: `Failed to delete file: ${error.message}` });
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
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`CapsuleOS v0.0.1 Server running on http://0.0.0.0:${PORT}`);
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