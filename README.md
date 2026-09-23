# Aegis - AI-Powered GitHub Repository Intelligence Platform

**Tagline:** AI Software Engineering Assistant

**Mission:** Build an AI platform that understands repositories, deploys applications, diagnoses failures, and helps developers fix them using retrieval, reasoning, and intelligent automation.

## Features

### MVP Features (Version 1)
- Connect GitHub repositories
- Repository ingestion and analysis
- Repository structure analysis
- Framework and language detection
- Docker deployment detection
- Deployment status tracking
- AI-powered log explanation
- Beginner-friendly error explanations
- Suggested fixes for common issues

### AI-Powered Features
- Repository understanding and codebase indexing
- Embeddings and vector search (RAG) capabilities
- Source code retrieval and analysis
- Deployment failure reasoning and root cause analysis
- Runtime failure analysis
- Environment variable and configuration analysis
- Dependency conflict detection
- Security issue identification
- AI-generated deployment reports with confidence scoring

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- GitHub Personal Access Token

### Backend Setup
```bash
git clone https://github.com/yourusername/aegis.git
cd aegis
cd backend
npm install
cp .env.example .env
# Edit .env to add your GitHub token
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Environment Variables
Create `.env` in backend directory:
```
PORT=5000
NODE_ENV=development
GITHUB_TOKEN=your_github_personal_access_token
FRONTEND_URL=http://localhost:5173
```

## Usage

### Web Interface
1. Start backend and frontend servers
2. Navigate to http://localhost:5173
3. Enter a GitHub repository URL
4. Click "Analyze Repository"
5. View detailed report with insights

### API Direct
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl": "https://github.com/owner/repo"}'
```

## Development

### Running Tests
```bash
cd backend
npm test
```

## CI/CD Pipeline

GitHub Actions workflow included in `.github/workflows/ci.yml`:
- Runs tests on push/PR
- Builds frontend for production
- Security scanning (planned)

## Deployment

Can be deployed to Vercel (frontend) + Render/Heroku (backend), Docker, or traditional VPS.

## License

MIT License
## Release v1.0.0
See [GitHub Release](https://github.com/Shreemeetnayak/aegis/releases/tag/v1.0.0) for downloadable assets and release notes.
