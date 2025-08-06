class CapsuleOSRenderer {
    constructor() {
        this.currentModule = 'notes';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadCurrentModule();
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const module = e.target.dataset.module;
                this.switchModule(module);
            });
        });
    }

    switchModule(moduleName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduleName);
        });

        // Update content
        document.querySelectorAll('.module').forEach(module => {
            module.classList.toggle('active', module.id === moduleName);
        });

        this.currentModule = moduleName;
        this.loadCurrentModule();
    }

    async loadCurrentModule() {
        switch(this.currentModule) {
            case 'notes':
                await notesModule.load();
                break;
            case 'capsules':
                await capsulesModule.load();
                break;
            case 'planner':
                await plannerModule.load();
                break;
            case 'tracker':
                await trackerModule.load();
                break;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const activeModule = document.querySelector('.module.active');
        activeModule.insertBefore(errorDiv, activeModule.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// APIHelper is loaded separately via script tag

// Notes Module
class NotesModule {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.isEditing = false;
        this.undoStack = [];
        this.redoStack = [];
        this.autoSaveTimer = null;
    }

    async load() {
        try {
            const files = await APIHelper.get('/api/files/notes');
            this.notes = [];

            for (const file of files.filter(f => f.endsWith('.md'))) {
                try {
                    const response = await APIHelper.get(`/api/file/notes/${file}`);
                    const title = file.replace('.md', '');
                    const preview = this.generatePreview(response.content);
                    
                    this.notes.push({
                        id: file,
                        title,
                        content: response.content,
                        preview,
                        lastModified: new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`Failed to load note ${file}:`, error);
                }
            }

            this.render();
        } catch (error) {
            console.error('Failed to load notes:', error);
            this.renderError('Failed to load notes');
        }
    }

    generatePreview(content) {
        // Remove markdown syntax for preview
        return content
            .replace(/^#{1,6}\s+/gm, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/`(.*?)`/g, '$1') // Remove inline code
            .replace(/\n/g, ' ') // Replace newlines with spaces
            .substring(0, 150);
    }

    render() {
        const container = document.getElementById('notes-content');
        
        if (this.notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No notes yet</h3>
                    <p>Create your first note to get started</p>
                </div>
            `;
            return;
        }

        const notesHTML = this.notes.map(note => `
            <div class="item-card" onclick="notesModule.editNote('${note.id}')">
                <div class="item-title">${note.title}</div>
                <div class="item-preview">${note.preview}</div>
                <div class="item-meta">
                    <span>Modified: ${app.formatDate(note.lastModified)}</span>
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); notesModule.deleteNote('${note.id}')" style="padding: 4px 8px; font-size: 12px;">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="items-grid">${notesHTML}</div>`;
    }

    renderError(message) {
        const container = document.getElementById('notes-content');
        container.innerHTML = `<div class="error">${message}</div>`;
    }

    showCreateModal() {
        this.currentNote = null;
        this.isEditing = false;
        
        document.getElementById('note-modal-title').textContent = 'Create Note';
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-modal').classList.add('active');
        this.setupEditor();
    }

    async editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNote = note;
        this.isEditing = true;

        document.getElementById('note-modal-title').textContent = 'Edit Note';
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-content').value = note.content;
        document.getElementById('note-modal').classList.add('active');
        this.setupEditor();
    }

    hideModal() {
        document.getElementById('note-modal').classList.remove('active');
        this.currentNote = null;
        this.isEditing = false;
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    async saveNote(event) {
        event.preventDefault();
        
        const title = document.getElementById('note-title').value.trim();
        const content = document.getElementById('note-content').value;

        if (!title) {
            app.showError('Please enter a note title');
            return;
        }

        try {
            const filename = `${title}.md`;
            
            // If editing and title changed, delete old file
            if (this.isEditing && this.currentNote && this.currentNote.id !== filename) {
                await APIHelper.delete(`/api/file/notes/${this.currentNote.id}`);
            }

            await APIHelper.post(`/api/file/notes/${filename}`, { content });
            this.hideModal();
            await this.load();
        } catch (error) {
            console.error('Failed to save note:', error);
            app.showError('Failed to save note');
        }
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            await APIHelper.delete(`/api/file/notes/${noteId}`);
            await this.load();
        } catch (error) {
            console.error('Failed to delete note:', error);
            app.showError('Failed to delete note');
        }
    }

    async autoSave() {
        const title = document.getElementById('note-title').value.trim();
        const content = document.getElementById('note-content').value;
        if (!title) return;
        try {
            const filename = `${title}.md`;
            await APIHelper.post(`/api/file/notes/${filename}`, { content });
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    setupEditor() {
        const contentEl = document.getElementById('note-content');
        this.undoStack = [contentEl.value];
        this.redoStack = [];
        const scheduleAutoSave = () => {
            if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.autoSave(), 2000);
        };
        contentEl.oninput = () => {
            this.undoStack.push(contentEl.value);
            if (this.undoStack.length > 1000) this.undoStack.shift();
            scheduleAutoSave();
        };
        contentEl.onkeydown = (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
            scheduleAutoSave();
        };
    }

    undo() {
        if (this.undoStack.length > 1) {
            const current = this.undoStack.pop();
            this.redoStack.push(current);
            const prev = this.undoStack[this.undoStack.length - 1];
            document.getElementById('note-content').value = prev;
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const value = this.redoStack.pop();
            document.getElementById('note-content').value = value;
            this.undoStack.push(value);
        }
    }
}

// Capsules Module
class CapsulesModule {
    constructor() {
        this.capsules = [];
        this.currentCapsule = null;
        this.isEditing = false;
        this.undoStack = [];
        this.redoStack = [];
        this.autoSaveTimer = null;
    }

    async load() {
        try {
            const files = await APIHelper.get('/api/files/capsules');
            this.capsules = [];

            for (const file of files.filter(f => f.endsWith('.json'))) {
                try {
                    const response = await APIHelper.get(`/api/file/capsules/${file}`);
                    const capsule = JSON.parse(response.content);
                    this.capsules.push(capsule);
                } catch (error) {
                    console.error(`Failed to load capsule ${file}:`, error);
                }
            }

            this.render();
        } catch (error) {
            console.error('Failed to load capsules:', error);
            this.renderError('Failed to load capsules');
        }
    }

    render() {
        const container = document.getElementById('capsules-content');
        
        if (this.capsules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No capsules yet</h3>
                    <p>Create your first capsule to get started</p>
                </div>
            `;
            return;
        }

        const capsulesHTML = this.capsules.map(capsule => `
            <div class="item-card" onclick="capsulesModule.editCapsule('${capsule.id}')">
                <div class="item-title">${capsule.title}</div>
                <div class="item-preview">${(capsule.payload || '').substring(0, 100)}${(capsule.payload || '').length > 100 ? '...' : ''}</div>
                <div class="item-meta">
                    <span>Tags: ${(capsule.tags || []).join(', ') || 'None'}</span>
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); capsulesModule.deleteCapsule('${capsule.id}')" style="padding: 4px 8px; font-size: 12px;">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="items-grid">${capsulesHTML}</div>`;
    }

    renderError(message) {
        const container = document.getElementById('capsules-content');
        container.innerHTML = `<div class="error">${message}</div>`;
    }

    showCreateModal() {
        this.currentCapsule = null;
        this.isEditing = false;
        
        document.getElementById('capsule-modal-title').textContent = 'Create Capsule';
        document.getElementById('capsule-title').value = '';
        document.getElementById('capsule-tags').value = '';
        document.getElementById('capsule-payload').value = '';
        document.getElementById('capsule-modal').classList.add('active');
        this.setupEditor();
    }

    async editCapsule(capsuleId) {
        const capsule = this.capsules.find(c => c.id === capsuleId);
        if (!capsule) return;

        this.currentCapsule = capsule;
        this.isEditing = true;

        document.getElementById('capsule-modal-title').textContent = 'Edit Capsule';
        document.getElementById('capsule-title').value = capsule.title;
        document.getElementById('capsule-tags').value = (capsule.tags || []).join(', ');
        document.getElementById('capsule-payload').value = capsule.payload || '';
        document.getElementById('capsule-modal').classList.add('active');
        this.setupEditor();
    }

    hideModal() {
        document.getElementById('capsule-modal').classList.remove('active');
        this.currentCapsule = null;
        this.isEditing = false;
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    async saveCapsule(event) {
        event.preventDefault();
        
        const title = document.getElementById('capsule-title').value.trim();
        const tagsText = document.getElementById('capsule-tags').value.trim();
        const payload = document.getElementById('capsule-payload').value;

        if (!title) {
            app.showError('Please enter a capsule title');
            return;
        }

        const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()) : [];
        const capsule = {
            id: this.currentCapsule ? this.currentCapsule.id : Date.now().toString(),
            title,
            tags,
            payload
        };

        const filename = `${capsule.id}.json`;

        try {
            await APIHelper.post(`/api/file/capsules/${filename}`, { content: JSON.stringify(capsule, null, 2) });
            this.hideModal();
            await this.load();
        } catch (error) {
            console.error('Failed to save capsule:', error);
            app.showError('Failed to save capsule');
        }
    }

    async deleteCapsule(capsuleId) {
        if (!confirm('Are you sure you want to delete this capsule?')) {
            return;
        }

        try {
            await APIHelper.delete(`/api/file/capsules/${capsuleId}.json`);
            await this.load();
        } catch (error) {
            console.error('Failed to delete capsule:', error);
            app.showError('Failed to delete capsule');
        }
    }

    async autoSave() {
        const title = document.getElementById('capsule-title').value.trim();
        const tags = document.getElementById('capsule-tags').value.trim().split(',').map(t => t.trim()).filter(Boolean);
        const payload = document.getElementById('capsule-payload').value;
        if (!title) return;
        const capsule = {
            id: title.replace(/\s+/g, '_') + '.json',
            title,
            tags,
            payload,
            lastModified: new Date().toISOString()
        };
        try {
            await APIHelper.post(`/api/file/capsules/${capsule.id}`, { content: JSON.stringify(capsule, null, 2) });
        } catch (error) {
            console.error('Auto-save capsule failed:', error);
        }
    }

    setupEditor() {
        const contentEl = document.getElementById('capsule-payload');
        this.undoStack = [contentEl.value];
        this.redoStack = [];
        const scheduleAutoSave = () => {
            if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.autoSave(), 2000);
        };
        contentEl.oninput = () => {
            this.undoStack.push(contentEl.value);
            if (this.undoStack.length > 1000) this.undoStack.shift();
            scheduleAutoSave();
        };
        contentEl.onkeydown = (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
            scheduleAutoSave();
        };
    }

    undo() {
        if (this.undoStack.length > 1) {
            const current = this.undoStack.pop();
            this.redoStack.push(current);
            const prev = this.undoStack[this.undoStack.length - 1];
            document.getElementById('capsule-payload').value = prev;
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const value = this.redoStack.pop();
            document.getElementById('capsule-payload').value = value;
            this.undoStack.push(value);
        }
    }
}

// Planner Module
class PlannerModule {
    constructor() {
        this.tasks = [];
        this.currentTask = null;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.isEditing = false;
    }

    async load() {
        document.getElementById('planner-date').value = this.currentDate;
        await this.loadDate();
    }

    async loadDate() {
        const datePicker = document.getElementById('planner-date');
        this.currentDate = datePicker.value || new Date().toISOString().split('T')[0];
        
        try {
            const filename = `${this.currentDate}.json`;
            const response = await APIHelper.get(`/api/file/planner/${filename}`);
            this.tasks = JSON.parse(response.content).tasks || [];
        } catch (error) {
            // File doesn't exist yet - that's ok
            this.tasks = [];
        }
        
        this.render();
    }

    render() {
        const container = document.getElementById('planner-content');
        
        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks for this date</h3>
                    <p>Create your first task!</p>
                </div>
            `;
            return;
        }

        const tasksHTML = this.tasks.map(task => `
            <div class="item-card task-item ${task.done ? 'completed' : ''}">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="plannerModule.toggleTask('${task.id}')" style="margin-right: 8px;">
                <div style="flex: 1;" onclick="plannerModule.editTask('${task.id}')">
                    <div class="item-title">${task.title}</div>
                    <div class="item-preview">Due: ${task.due ? new Date(task.due).toLocaleString() : 'No due date'}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger btn-small" onclick="plannerModule.deleteTask('${task.id}')" style="padding: 4px 8px; font-size: 12px;">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="items-grid">${tasksHTML}</div>`;
    }

    showCreateModal() {
        this.currentTask = null;
        this.isEditing = false;
        
        document.getElementById('task-modal-title').textContent = 'Create Task';
        document.getElementById('task-title').value = '';
        document.getElementById('task-due').value = '';
        document.getElementById('task-modal').classList.add('active');
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentTask = task;
        this.isEditing = true;

        document.getElementById('task-modal-title').textContent = 'Edit Task';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-due').value = task.due || '';
        document.getElementById('task-modal').classList.add('active');
    }

    hideModal() {
        document.getElementById('task-modal').classList.remove('active');
        this.currentTask = null;
        this.isEditing = false;
    }

    async saveTask(event) {
        event.preventDefault();
        
        const title = document.getElementById('task-title').value.trim();
        const due = document.getElementById('task-due').value;

        if (!title) {
            app.showError('Please enter a task title');
            return;
        }

        const task = {
            id: this.currentTask ? this.currentTask.id : Date.now().toString(),
            title,
            due: due || new Date().toISOString(),
            done: this.currentTask ? this.currentTask.done : false
        };

        if (this.isEditing) {
            const index = this.tasks.findIndex(t => t.id === this.currentTask.id);
            if (index !== -1) {
                this.tasks[index] = task;
            }
        } else {
            this.tasks.push(task);
        }

        await this.saveTasks();
        this.hideModal();
    }

    async toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.done = !task.done;
            await this.saveTasks();
            this.render();
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        this.tasks = this.tasks.filter(t => t.id !== taskId);
        await this.saveTasks();
        this.render();
    }

    async saveTasks() {
        try {
            const filename = `${this.currentDate}.json`;
            const data = { date: this.currentDate, tasks: this.tasks };
            await APIHelper.post(`/api/file/planner/${filename}`, { content: JSON.stringify(data, null, 2) });
        } catch (error) {
            console.error('Failed to save tasks:', error);
            app.showError('Failed to save tasks');
        }
    }
}

// Tracker Module
class TrackerModule {
    constructor() {
        this.habits = [];
        this.todayLog = {};
        this.today = new Date().toISOString().split('T')[0];
    }

    async load() {
        try {
            // Load habits
            const habitsResponse = await APIHelper.get('/api/file/tracker/habits.json');
            const habitsData = JSON.parse(habitsResponse.content);
            this.habits = habitsData.habits || [];
            
            // Load today's log
            try {
                const logResponse = await APIHelper.get(`/api/file/tracker/logs/${this.today}.json`);
                this.todayLog = JSON.parse(logResponse.content);
            } catch {
                this.todayLog = {};
            }
            
            this.render();
        } catch (error) {
            console.error('Failed to load tracker:', error);
            this.renderError('Failed to load tracker');
        }
    }

    render() {
        const container = document.getElementById('tracker-content');
        
        if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No habits to track yet</h3>
                    <p>Create your first habit!</p>
                </div>
            `;
            return;
        }

        const habitsHTML = this.habits.map(habit => `
            <div class="item-card habit-item">
                <div style="flex: 1;">
                    <div class="item-title">${habit.name}</div>
                    <div class="item-preview">${habit.description || 'No description'}</div>
                </div>
                <div class="habit-controls">
                    <input type="checkbox" 
                           ${this.todayLog.completions && this.todayLog.completions[habit.id] ? 'checked' : ''} 
                           onchange="trackerModule.toggleHabit('${habit.id}', this.checked)"
                           style="margin-right: 8px;">
                    <button class="btn btn-danger btn-small" onclick="trackerModule.deleteHabit('${habit.id}')" style="padding: 4px 8px; font-size: 12px;">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                <h3 style="margin-bottom: 8px;">Today: ${new Date(this.today).toLocaleDateString()}</h3>
                <p style="color: var(--text-secondary); font-size: 14px;">Check off habits as you complete them</p>
            </div>
            <div class="items-grid">${habitsHTML}</div>
        `;
    }

    renderError(message) {
        const container = document.getElementById('tracker-content');
        container.innerHTML = `<div class="error">${message}</div>`;
    }

    showCreateModal() {
        document.getElementById('habit-modal-title').textContent = 'Create Habit';
        document.getElementById('habit-name').value = '';
        document.getElementById('habit-description').value = '';
        document.getElementById('habit-modal').classList.add('active');
    }

    hideModal() {
        document.getElementById('habit-modal').classList.remove('active');
    }

    async saveHabit(event) {
        event.preventDefault();
        
        const name = document.getElementById('habit-name').value.trim();
        const description = document.getElementById('habit-description').value.trim();

        if (!name) {
            app.showError('Please enter a habit name');
            return;
        }

        const habit = {
            id: Date.now().toString(),
            name,
            description,
            created: new Date().toISOString()
        };

        this.habits.push(habit);

        try {
            const habitsData = { habits: this.habits };
            await APIHelper.post('/api/file/tracker/habits.json', { content: JSON.stringify(habitsData, null, 2) });
            this.hideModal();
            await this.load();
        } catch (error) {
            console.error('Failed to save habit:', error);
            app.showError('Failed to save habit');
        }
    }

    async toggleHabit(habitId, completed) {
        try {
            if (!this.todayLog.completions) {
                this.todayLog.completions = {};
            }
            
            this.todayLog.completions[habitId] = completed;
            this.todayLog.date = this.today;

            await APIHelper.post(`/api/file/tracker/logs/${this.today}.json`, { content: JSON.stringify(this.todayLog, null, 2) });
        } catch (error) {
            console.error('Failed to save habit completion:', error);
            app.showError('Failed to save habit completion');
        }
    }

    async deleteHabit(habitId) {
        if (!confirm('Are you sure you want to delete this habit?')) {
            return;
        }

        try {
            this.habits = this.habits.filter(h => h.id !== habitId);
            const habitsData = { habits: this.habits };
            await APIHelper.post('/api/file/tracker/habits.json', { content: JSON.stringify(habitsData, null, 2) });
            await this.load();
        } catch (error) {
            console.error('Failed to delete habit:', error);
            app.showError('Failed to delete habit');
        }
    }
}

// Initialize app and modules
const app = new CapsuleOSRenderer();
const notesModule = new NotesModule();
const capsulesModule = new CapsulesModule();
const plannerModule = new PlannerModule();
const trackerModule = new TrackerModule();

// Setup form handlers
document.getElementById('note-form').addEventListener('submit', (e) => {
    notesModule.saveNote(e);
});

document.getElementById('capsule-form').addEventListener('submit', (e) => {
    capsulesModule.saveCapsule(e);
});

document.getElementById('task-form').addEventListener('submit', (e) => {
    plannerModule.saveTask(e);
});

document.getElementById('habit-form').addEventListener('submit', (e) => {
    trackerModule.saveHabit(e);
});

// Setup date change handler
document.getElementById('planner-date').addEventListener('change', () => {
    plannerModule.loadDate();
});

// Global Search and Shortcuts
let searchTimeout;

function showSearchModal() {
    const modal = document.getElementById('search-modal');
    modal.classList.add('active');
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search-results').innerHTML = '';
    input.focus();
}

function hideSearchModal() {
    document.getElementById('search-modal').classList.remove('active');
}

async function performSearch(query) {
    try {
        const data = await APIHelper.get(`/api/search?q=${encodeURIComponent(query)}`);
        const resultsEl = document.getElementById('search-results');
        const resultsHtml = data.results.map(r => `<li><a href="#">${r.path}</a></li>`).join('');
        resultsEl.innerHTML = DOMPurify.sanitize(resultsHtml);
        Array.from(resultsEl.querySelectorAll('a')).forEach((a, idx) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                openSearchResult(data.results[idx].path);
            });
        });
    } catch (err) {
        console.error('Search failed', err);
    }
}

function openSearchResult(pathStr) {
    hideSearchModal();
    const parts = pathStr.split('/');
    const module = parts[0];
    const file = parts.slice(1).join('/');
    app.switchModule(module);
    if (module === 'notes') {
        notesModule.editNote(file);
    } else if (module === 'capsules') {
        capsulesModule.editCapsule(file);
    } else if (module === 'planner') {
        plannerModule.editTask(file.replace('.json',''));
    }
}

document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const value = e.target.value.trim();
    searchTimeout = setTimeout(() => {
        if (value) performSearch(value);
    }, 200);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        notesModule.showCreateModal();
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        showSearchModal();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (document.getElementById('note-modal').classList.contains('active')) notesModule.autoSave();
        if (document.getElementById('capsule-modal').classList.contains('active')) capsulesModule.autoSave();
    }
    if (e.key === 'Escape') {
        hideSearchModal();
    }
});

document.getElementById('search-modal').addEventListener('click', (e) => {
    if (e.target.id === 'search-modal') hideSearchModal();
});