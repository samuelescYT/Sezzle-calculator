# Full-Stack Calculator

A calculator app with a **React + TypeScript + Tailwind CSS** frontend and a **Go** REST microservice backend.

> Work in progress: this README will be expanded with API examples, design decisions and coverage reports.

## Project structure

```
.
├── backend/            # Go REST API (standard library only)
│   ├── cmd/server/     # Entry point
│   └── internal/api/   # HTTP router & handlers
└── frontend/           # React + Vite + TypeScript + Tailwind CSS
```

## Prerequisites

- Go 1.27+
- Node.js 24+ / npm 11+

## Running locally

**Backend** (http://localhost:8080):

```bash
cd backend
go run ./cmd/server
```

**Frontend** (http://localhost:5173, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend && go test -cover ./...
cd frontend && npm test          # or: npm run coverage
```
