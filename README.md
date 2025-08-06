# CapsuleOS

> Local-first cognitive operating system for personal productivity

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

CapsuleOS is a modular productivity application designed for efficient personal management. It features four core modules for organizing information and tasks, with a focus on local-first storage and offline functionality.

## Features

- **📝 Notes** - Markdown-based note-taking with real-time editing
- **🧩 Capsules** - Structured JSON objects for flexible data storage
- **📅 Planner** - Daily task management with due dates and completion tracking
- **✅ Tracker** - Habit formation and daily logging system

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/num1hub/capsuleos.git
   cd capsuleos
   npm install
   ```

2. **Run development server**
   ```bash
   npm start
   ```

3. **Open in browser**
   ```
   http://localhost:5000
   ```

## Architecture

- **Frontend**: Vanilla JavaScript with modular architecture
- **Backend**: Express.js REST API
- **Storage**: File-based local storage (Markdown + JSON)
- **UI**: Dark theme with tabbed navigation
- **Build**: Electron packaging for desktop applications

## Project Structure

```
capsuleos/
├── src/
│   ├── index.html          # Main UI
│   ├── app.js             # Application logic
│   └── js/
│       └── api.js         # API helper
├── data/                  # User data (auto-created)
│   ├── notes/            # Markdown files
│   ├── capsules/         # JSON objects
│   ├── planner/          # Daily task files
│   └── tracker/          # Habit definitions and logs
├── index.js              # Express server
├── build.js              # Build script
└── package.json          # Dependencies
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Scripts
- `npm start` - Start development server
- `npm run dev` - Same as start
- `npm run build` - Build Windows executable

### API Endpoints
- `GET /api/files/{folder}` - List files in folder
- `GET /api/file/{path}` - Read file content
- `POST /api/file/{path}` - Write/create file
- `DELETE /api/file/{path}` - Delete file

## Building

### Windows Desktop App
```bash
npm run build
```
Creates installer in `dist/` folder.

### Web Deployment
Deploy `index.js` to any Node.js hosting platform:
- Render, Railway, Heroku, DigitalOcean App Platform

## Data Storage

All data is stored locally in human-readable formats:
- **Notes**: Markdown files (`.md`)
- **Capsules**: JSON objects with `{id, title, tags, payload}`
- **Tasks**: Daily JSON files with task arrays
- **Habits**: JSON definitions and daily completion logs

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/num1hub/capsuleos/issues)
- **Documentation**: See source code comments
- **Discussions**: [GitHub Discussions](https://github.com/num1hub/capsuleos/discussions)

## Upgrading

See [CHANGELOG.md](CHANGELOG.md) for release notes. Upgrades are data-compatible across versions; backup your `data/` folder and replace application files to move from 0.0.2 to 0.0.3.