# Aegis Architecture

## High-Level Goal

Aegis is an AI Software Engineering Assistant that understands repositories, deploys applications, analyzes failures, retrieves relevant context, and provides evidence-backed recommendations.

## High-Level Components

- Frontend
- Backend API
- AI Service
- Background Workers
- PostgreSQL
- Vector Database
- Redis Queue
- GitHub Integration
- Docker Runner

---

# System Flow

User

↓

GitHub Login

↓

Repository Selection

↓

Repository Ingestion

↓

Repository Analysis

↓

Repository Indexing

↓

Embeddings Generation

↓

Vector Database

↓

Deployment

↓

Log Collection

↓

AI Reasoning

↓

Evidence Retrieval

↓

Recommendation Engine

↓

Developer Dashboard

# Step 1 — Repository Ingestion

Purpose:
Bring a GitHub repository into Aegis so the AI can understand it.

Input:
- GitHub Repository URL

Output:
- Local copy of the repository
- Repository metadata
- Ready for analysis

# Step 2 — Repository Analysis

Purpose:
Understand what kind of project the repository contains.

The AI should identify:

- Programming language(s)
- Framework (React, Next.js, Express, Django, etc.)
- Package manager (npm, pnpm, yarn, pip, cargo...)
- Build commands
- Run commands
- Dockerfile
- docker-compose.yml
- Database technology
- Environment variables
- CI/CD configuration
- Project structure

Output:

A structured "Repository Profile" describing how the application works before any deployment begins.

# Step 3 — Repository Indexing

Purpose:
Convert the repository into searchable knowledge for the AI.

The system should:

- Read every source code file
- Ignore unnecessary files (node_modules, build folders, binaries)
- Split large files into smaller chunks
- Store metadata for each chunk:
  - File path
  - Language
  - Function/Class name
  - Imports
  - Repository
- Generate embeddings for every chunk
- Store embeddings in the vector database

Output:

A searchable knowledge base of the repository that allows the AI to retrieve only the most relevant code when answering questions.

# Step 4 — AI Reasoning

Purpose:
Use the indexed repository and deployment context to understand problems and generate reliable answers.

Input:

- User question
- Deployment logs
- Runtime logs
- Retrieved source code
- Repository profile

The AI should:

- Retrieve only relevant code from the vector database
- Read deployment logs
- Read configuration files
- Read Docker files
- Read environment configuration
- Combine all retrieved context
- Generate an evidence-backed answer
- Assign a confidence score

Output:

- Explanation
- Root cause
- Recommended fix
- Confidence score
- Evidence (files, logs, code snippets used)

# Step 5 — Tool Calling

Purpose:
Allow the AI to perform actions instead of only answering questions.

Available Tools:

- GitHub Tool
- Docker Tool
- Log Reader
- Repository Search
- File Reader
- Deployment Manager

Output:

The AI can retrieve information or perform actions before generating a response.

# Step 6 — Evidence

Purpose:
Every AI answer should include evidence.

Evidence may include:

- Source code files
- Deployment logs
- Docker logs
- Configuration files
- Environment variables
- GitHub Actions
- Documentation

The AI should explain HOW it reached its conclusion instead of only giving an answer.