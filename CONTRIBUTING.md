# Contributing to Aegis

Thank you for your interest in contributing to Aegis! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How to Contribute

### Reporting Bugs

Before reporting a bug, please:
1. Check if the bug has already been reported in the Issues tab
2. Search for similar issues (open and closed)
3. If not found, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, browser)
   - Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
1. Check existing issues for similar requests
2. Create a new issue with:
   - Clear title and description
   - Use case and motivation
   - Proposed solution (if any)
   - Alternatives considered

### Pull Request Process

1. **Fork** the repository
2. **Create a branch** for your feature/fix: `git checkout -b feature/your-feature-name`
3. **Make changes** following the coding standards below
4. **Test your changes** thoroughly
5. **Commit** with a clear message following conventional commits
6. **Push** to your fork
7. **Open a Pull Request** against the `main` branch

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Local Development
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aegis.git
cd aegis

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/aegis.git

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
cd backend && npm test
cd ../frontend && npm run build

# Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

## Coding Standards

### General
- Follow existing code style and patterns
- Write clean, readable, and maintainable code
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused (< 50 lines)

### JavaScript/Node.js
- Use ES6+ features (const, let, arrow functions, async/await)
- Prefer functional programming patterns
- Handle errors appropriately with try/catch
- Use meaningful error messages
- No console.log in production code

### React/Frontend
- Use functional components with hooks
- Follow React best practices
- Keep components small and reusable
- Use PropTypes or TypeScript for type checking
- Follow component composition patterns

### Testing
- Write tests for new functionality
- Maintain > 80% test coverage
- Use descriptive test names
- Test edge cases and error conditions

### Git Commits
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Maintenance tasks

Examples:
```
feat(analyzer): add support for Python dependency analysis
fix(api): handle rate limiting errors gracefully
docs(readme): update installation instructions
```

### Pull Request Guidelines
- Keep PRs focused and small
- Include tests for new features
- Update documentation if needed
- Ensure CI passes
- Respond to review feedback promptly
- Squash commits before merge (maintainers will handle)

## Project Structure

```
aegis/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── analyzers/      # Analysis modules
│   │   ├── database/       # Database layer
│   │   └── utils/          # Utilities
│   └── tests/              # Unit/integration tests
├── frontend/                # React/Vite client
│   ├── src/
│   │   ├── components/     # React components
│   │   └── styles/         # CSS styles
│   └── public/             # Static assets
├── .github/workflows/       # CI/CD pipelines
└── docs/                   # Documentation
```

## Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm run build  # Verify build works
```

## Documentation

- Update README.md for user-facing changes
- Update API documentation for endpoint changes
- Add JSDoc comments for new functions
- Update CONTRIBUTING.md if process changes

## Release Process

Releases are managed by maintainers:
1. Version bump in package.json
2. Generate changelog
3. Create GitHub release
4. Deploy to production

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion in GitHub Discussions
- Contact maintainers directly

Thank you for contributing to Aegis!