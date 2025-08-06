/**
 * CapsuleOS API Helper
 * Handles all communication between frontend and backend
 */
class APIHelper {
    static async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${options.method || 'GET'} ${url}]:`, error);
            throw error;
        }
    }

    static async get(url) {
        return this.request(url, { method: 'GET' });
    }

    static async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }

    // File operations with validation
    static async listFiles(folder) {
        if (!folder || typeof folder !== 'string') {
            throw new Error('Invalid folder parameter');
        }
        return this.get(`/api/files/${encodeURIComponent(folder)}`);
    }

    static async readFile(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path parameter');
        }
        return this.get(`/api/file/${encodeURIComponent(filePath)}`);
    }

    static async writeFile(filePath, content) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path parameter');
        }
        if (typeof content !== 'string') {
            throw new Error('Content must be a string');
        }
        return this.post(`/api/file/${encodeURIComponent(filePath)}`, { content });
    }

    static async deleteFile(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path parameter');
        }
        return this.delete(`/api/file/${encodeURIComponent(filePath)}`);
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHelper;
}