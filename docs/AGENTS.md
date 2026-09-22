# AI Components

## AI Orchestrator

Responsibility:
Receive the user's request and decide what needs to happen.

---

## Repository Analyzer

Responsibility:
Understand the repository and create the Repository Profile.

---

## Retrieval Engine

Responsibility:
Find the most relevant code, logs, and configuration before the AI reasons.

---

## Reasoning Engine

Responsibility:
Combine retrieved context, deployment logs, and repository information to generate an answer.

---

## Report Generator

Responsibility:
Generate deployment reports, summaries, and recommendations.

---

## Why separate them?

Each component has one responsibility, making Aegis easier to maintain, test, and improve.