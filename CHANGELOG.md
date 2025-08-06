# Changelog

## 0.0.6 - 2025-08-09
### Added
- Global search can include archived items via "Include Archived" toggle.

## 0.0.5 - 2025-08-09
### Added
- In-memory Fuse.js search index with file system watching and query API.
- Updated UI and API to use the new search subsystem.

## 0.0.4 - 2025-08-08
### Added
- Filter inputs for notes and capsules with real-time search.
- Planner task priorities with sorting and display.
- Habit editing and deletion confirmations.
- Keyboard shortcuts for module switching and quick creation.
### Changed
- Stabilized capsule autosave with persistent IDs and timestamps.
- Improved note and capsule autosave with manual Ctrl+S flush.
- Updated UI styles and version strings to 0.0.4.

## 0.0.3 - 2025-08-06
### Changed
- Debounced note and capsule auto-save to save after 2 seconds of inactivity.
- Sanitized search result rendering with DOMPurify to mitigate XSS risks.
- Updated application version to 0.0.3.
