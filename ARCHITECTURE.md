# Reelcruit — Architecture

## Layer Model

```
UI (pages/) → Router (server.ts) → Handlers (handlers/) → Domain (domain/) → DB (db.ts)
```

| Layer | Can Import | Cannot Import | Purpose |
|-------|-----------|---------------|---------|
| `server.ts` | `handlers/` | `domain/`, `schema.ts` | Route registration only |
| `handlers/` | `domain/`, `db.ts` | other handlers | Input validation, HTTP glue |
| `domain/` | pure logic only | `handlers/`, `db.ts` | Business rules, AI calls, algorithms |
| `pages/` | `@mspbots/ui`, `$fetch` | raw `fetch()`, raw HTML | User interface |

## Domain Table

| Domain | Handler | Domain File | Responsibility |
|--------|---------|-------------|----------------|
| Jobs | `jobs.handler.ts` | `jobs.domain.ts` | Create jobs, generate AI questions |
| Candidates | `candidates.handler.ts` | `candidates.domain.ts` | Invite candidates, generate unique links |
| Interviews | `interviews.handler.ts` | `interviews.domain.ts` | Start/complete interview sessions |
| Responses | `responses.handler.ts` | `responses.domain.ts` | Store video, transcribe, AI score |
| Reviews | `reviews.handler.ts` | `reviews.domain.ts` | Hiring manager dashboard, satisfaction scores |

## Dependency Rules

- `server.ts` ONLY imports from `handlers/` — never from `domain/` or `schema.ts` directly
- `handlers/` validate inputs and delegate to `domain/` — no business logic lives here
- `domain/` contains all business logic — no HTTP, no direct DB access
- `pages/` use `$fetch` only — never raw `fetch()`, never raw HTML elements
- All data persists to the database — never in-memory, never local files

## Project Structure

```
app-reelcruit/
├── ARCHITECTURE.md
├── docs/
│   ├── PRODUCT_SENSE.md
│   ├── DESIGN.md
│   ├── QUALITY_SCORE.md
│   ├── SECURITY.md
│   ├── ENTROPY_CHECK.md
│   ├── PLANS.md
│   ├── data-model.md
│   ├── api-contracts/
│   │   ├── jobs.md
│   │   ├── candidates.md
│   │   ├── interviews.md
│   │   └── responses.md
│   └── integrations/
│       ├── claude-api.md
│       └── video-storage.md
├── scripts/
│   └── lint-arch.ts
├── pages/
│   ├── Jobs.tsx
│   ├── JobDetail.tsx
│   ├── CandidateInterview.tsx
│   └── ReviewDashboard.tsx
├── service/
│   ├── server.ts
│   ├── db.ts
│   ├── schema.ts
│   ├── drizzle.config.ts
│   ├── domain/
│   │   ├── jobs.domain.ts
│   │   ├── candidates.domain.ts
│   │   ├── interviews.domain.ts
│   │   ├── responses.domain.ts
│   │   └── reviews.domain.ts
│   └── handlers/
│       ├── jobs.handler.ts
│       ├── candidates.handler.ts
│       ├── interviews.handler.ts
│       ├── responses.handler.ts
│       └── reviews.handler.ts
├── mspbot.config.ts
├── package.json
└── .env
```
