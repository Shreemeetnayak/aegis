# Aegis - AI-Powered GitHub Repository Intelligence Platform

**Tagline:** AI Software Engineering Assistant

**Mission:** Build an AI platform that understands repositories, deploys applications, diagnoses failures, and helps developers fix them using retrieval, reasoning, and intelligent automation.

---

## 🚀 Quick Start (Easiest Way)

### Windows Users
**Double-click `install-and-run.bat`** — that's it! It will:
1. Check/install Node.js automatically
2. Install all dependencies
3. Help you add your GitHub token
4. Start the app and open your browser

### Mac / Linux Users
Open terminal in the Aegis folder and run:
```bash
./install-and-run.sh
```

---

## 📋 What You Need

| Requirement | How to Get It |
|-------------|---------------|
| **Node.js 18+** | Auto-installed by scripts above, or download from [nodejs.org](https://nodejs.org/) |
| **GitHub Token** | Get one free at [github.com/settings/tokens](https://github.com/settings/tokens) (no special permissions needed) |

---

## 🎯 What It Does

- **Analyze any GitHub repo** — paste a URL, get instant insights
- **Explain deployment errors** — paste cryptic logs, get plain English explanations
- **Detect frameworks, languages, Docker, CI/CD, tests** — automatically
- **Check deployment readiness** — know before you deploy
- **AI-powered suggestions** — fixes for common issues

---

## 🖥️ Manual Start (If Scripts Don't Work)

```bash
# 1. Install dependencies (one-time)
npm run install-all

# 2. Configure GitHub token
cp backend/.env.example backend/.env
# Edit backend/.env and add your GITHUB_TOKEN

# 3. Start both servers
npm run dev
```

Then open: **http://localhost:5173**

---

## 🐳 Docker (Alternative)

```bash
# Copy and edit environment
cp backend/.env.example backend/.env
# Edit backend/.env with your GITHUB_TOKEN

# Start everything
docker-compose up -d

# Frontend: http://localhost
# Backend API: http://localhost:5000
```

---

## 📁 Project Structure

```
aegis/
├── backend/          # Node.js/Express API server
├── frontend/         # React 18 + Vite dashboard
├── install-and-run.bat    # Windows one-click installer
├── install-and-run.sh     # Mac/Linux one-click installer
├── start.bat              # Windows dev start (needs Node.js)
├── start.sh               # Mac/Linux dev start (needs Node.js)
├── docker-compose.yml     # Docker deployment
└── package.json           # Root workspace config
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Node.js not found" | Run `install-and-run.bat` / `.sh` (auto-installs) |
| "Port 5000/5173 in use" | Close other apps using those ports, or edit `.env` |
| "GitHub token invalid" | Get a new token at [github.com/settings/tokens](https://github.com/settings/tokens) |
| Scripts won't run | Right-click → "Run as Administrator" (Windows) or `chmod +x *.sh` (Mac/Linux) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built for developers who want to understand their code better.**
