# Contributing to CapsuleOS

Thank you for your interest in contributing to CapsuleOS!

## Development Setup

1. **Prerequisites**
   - Node.js 18+
   - npm or yarn

2. **Setup**
   ```bash
   git clone https://github.com/yourusername/capsuleos.git
   cd capsuleos
   npm install
   npm start
   ```

## Project Structure

```
src/
├── index.html    # Main UI
├── app.js       # Application logic  
└── js/
    └── api.js   # API helper
```

## Contributing Guidelines

### Code Style
- Use ES6+ features
- Follow existing patterns
- Add comments for complex logic
- Handle errors gracefully

### Pull Request Process
1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Make changes following code style
4. Test your changes thoroughly
5. Commit with clear messages
6. Submit pull request

### Issue Guidelines
- Use issue templates
- Provide clear descriptions
- Include reproduction steps for bugs
- Add screenshots if helpful

## API Patterns

All backend communication uses the APIHelper class:
```javascript
// Reading data
const data = await APIHelper.get('/api/files/notes');

// Writing data  
await APIHelper.post('/api/file/notes/example.md', { content: 'Hello' });
```

## Module Development

New modules should extend patterns from existing modules:
1. Load data from API
2. Render UI components
3. Handle user interactions
4. Save changes back to API

## Documentation

- Update README for significant changes
- Add JSDoc comments for new functions
- Include examples for new features

## Testing

- Test all functionality manually
- Verify API endpoints work correctly
- Check error handling edge cases
- Ensure data persistence

Thank you for contributing to CapsuleOS!