# CapsuleOS

CapsuleOS v0.0.1 is a local‑first desktop application for managing **Capsules** – structured JSON documents stored on your machine. The app uses Electron with an Express backend and Fuse.js search.

## Features
- Create, edit, and version Capsules stored as individual JSON files.
- Fuzzy search across titles, tags and payloads.
- Archive Capsules or restore previous versions.
- Import/Export all data as a zip archive.
- Keyboard shortcuts: **Ctrl+N** new capsule, **Ctrl+F** search.

## Development
```bash
npm install
npm start   # runs the Express server
```
Open `http://localhost:5000` in a browser or run via Electron using `npm run build` to package.

## Testing
```bash
npm test
```

## Building
The project uses `electron-builder`.
```bash
npm run build
```
Artifacts will be placed in the `dist/` folder for your platform.

## Data
Capsules are stored under `data/capsules/`. Each capsule file is versioned using `base.vN.json` naming.

## License
MIT
