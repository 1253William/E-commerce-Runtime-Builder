# SELTRA V5 — PART C: ALTERNATE RUNTIME

## Node.js / NestJS / PostgreSQL (Neon) / Next.js

**Status:** Replaces the Cloudflare-native runtime in Part B for local development and deployment
**Reason:** `workerd` local runtime is unreliable on Windows (access-violation crashes tied to native binary + OS environment); this stack matches your actual working environment and stated preferences
**Deploy targets:** API → Render. Frontend → Vercel.
**Cloudflare relationship:** Not abandoned — R2 and Workers AI remain usable over plain HTTPS APIs from any runtime, so the $10K credit allocation is still spendable. Everything that required the local `workerd` binary or Cloudflare-only primitives is replaced below.

This document does not replace Part A. The product model, agents, artifact pipeline, phase plan, and everything conceptual in Parts A and B stays as written. This document replaces the **infrastructure implementation** of Part B sections B.4–B.19, B.53, B.62, B.74–B.75, and B.101–B.107. Every other section of Part B (agent contracts, reactor loop, verification, security, phase definitions of done, etc.) is implemented on top of this runtime unchanged.

---

## C.1 Why this change, precisely

`wrangler dev` runs a real copy of `workerd` (Cloudflare's V8-isolate runtime) as a native Windows binary outside WSL2. That binary is known to crash with access violations on some Windows configurations independent of your code — reinstalling the VC++ redistributable, changing paths, and reinstalling dependencies are all mitigations for an environment problem, not your application. Rather than fight an environment you don't control and can't install system components into, move the runtime to plain Node.js, which has no native-binary dependency and runs identically on Windows, macOS, Linux, Render, and Vercel.

Nothing about Part A's product requirements or Part B's agent architecture depends on Cloudflare specifically. Cloudflare was chosen in the original spec for the $10K credit runway (B.10, B.100) — that reasoning still holds, it just now applies to R2 and Workers AI as callable services rather than as the execution substrate.

---

## C.2 Replacement Map

| Part B primitive | Section | Replacement | Notes |
|---|---|---|---|
| Cloudflare Workers + Hono | B.5 | **NestJS on Node.js** | Full framework swap, not a routing-library swap — see C.4 on what this means for phase 1–4 code |
| Cloudflare D1 + Drizzle | B.6 | **PostgreSQL (Neon) + Prisma** | Matches your stated backend preference; Neon gives serverless Postgres with branching, similar operational shape to D1 |
| Cloudflare R2 | B.7 | **Kept as-is** | R2 has an S3-compatible API; call it with `@aws-sdk/client-s3` over HTTPS from Node — no Worker or local `workerd` needed |
| Cloudflare Workers AI | B.8–B.9 | **Kept as an `AIProvider` option**, called via its REST API, not via a deployed Worker | See C.6 |
| Durable Objects | B.13 | **Postgres-backed session/state tables** with row-level locking | See C.7 — the one primitive without a clean 1:1 replacement |
| Cloudflare Queues | B.14 | **pg-boss on Neon Postgres** | No separate service, no second free-tier connection budget — see C.6a |
| Cloudflare Workflows | B.15 | **Sequential orchestration persisted to Postgres** | Simple state-machine table; do not reach for Temporal yet — see B.109, still applies |
| Cloudflare Browser Rendering | B.35 | **Playwright**, run in-process or as a separate Render worker service | Easier to debug locally than a hosted browser API |
| WebSockets/SSE via Cloudflare | B.75 | **NestJS Gateway (Socket.IO) or native SSE endpoint** | Standard Node real-time patterns |
| `wrangler dev` | B.101, B.103 | **`nest start --watch` (API) + `next dev` (web)** | No native binary, no Windows crash surface |
| Render.com — new | — | **API + worker deployment target** | You specified this |
| Vercel — new | — | **Frontend deployment target** | You specified this; Next.js is a first-class fit |

---

## C.3 Updated Technology Stack

**Frontend** (replaces B.4 — Next.js/React/Tailwind/shadcn unchanged, deploy target added)

```text
Next.js (App Router)
TypeScript
React
Tailwind CSS
shadcn/ui
Deploy: Vercel
```

**Backend** (replaces B.5)

```text
Node.js (LTS)
TypeScript
NestJS
Deploy: Render (Web Service for API, Background Worker for queue processing)
```

**Database** (replaces B.6)

```text
PostgreSQL via Neon (serverless, branching)
Prisma ORM
```

**Object storage** (B.7 — unchanged)

```text
Cloudflare R2, accessed via S3-compatible API (@aws-sdk/client-s3)
```

**Queue / async jobs** (replaces B.14)

```text
pg-boss (job queue running on the existing Neon Postgres instance)
No separate Redis/Upstash dependency
```

**AI** (B.8–B.9 — provider list expands, abstraction unchanged)

```text
AIProvider interface stays exactly as defined in B.8.
Implementations: CloudflareAIProvider (Workers AI REST API)
                 + a second provider (Anthropic or OpenAI) as OPTIONAL_FALLBACK_PROVIDER
ModelRouter (B.9) unchanged in responsibility.
```

---

## C.4 What "swap the framework" means for your existing Phase 1–4 code

This is a genuine rewrite of the HTTP layer, not a config change. Hono and NestJS have different routing, middleware, and dependency-injection models. What ports over largely unchanged, if it was written with reasonable separation of concerns (per B.5's own instruction: *"Do not put core business logic directly inside [the framework's] server components"*):

**Ports over as-is (pure TypeScript, no framework coupling):**
- Business Intent Model (A.11)
- Agent contracts, Orchestrator, Planner, Builder, Designer logic (B.27–B.39)
- Artifact schemas (B.52)
- Model Router logic (B.9) — only the Cloudflare-specific HTTP calls inside `CloudflareAIProvider` need adjusting for calling Workers AI standalone (C.6) instead of via a Worker binding
- Verification/Repair logic (B.36–B.37)
- Prompt architecture, context compiler (B.51, B.87)

**Needs rewriting:**
- Every route handler (Hono `app.get(...)` → NestJS controller + service)
- Auth middleware (Hono middleware → NestJS Guards)
- The D1/Drizzle data access layer → Prisma (schema translates directly, see C.5)
- Anything that referenced Worker bindings (`env.DB`, `env.ASSETS`) → Prisma client + S3 client, injected via NestJS DI

**Recommendation:** before rewriting, audit the Phase 1–4 code for how cleanly business logic is separated from Hono route handlers. If it's clean, this is a 1–3 day mechanical port. If business logic got embedded directly in route handlers (easy to do under time pressure), budget more — and it's worth doing the separation properly this time since NestJS's DI model rewards it.

---

## C.5 Database Migration — D1/Drizzle → Neon/Prisma

The table list in B.53 is unchanged — same entities, same relationships. Steps:

1. Stand up the Neon project (you've already opened the Create Project screen — enable **Postgres database** only for now; leave Object storage, Functions, AI gateway, and Neon Auth off, since R2 stays on Cloudflare, compute stays on Render/NestJS, and auth is handled in NestJS directly per B.55, not by Neon Auth).
2. Write a Prisma schema mirroring the D1/Drizzle schema — same table names and relationships from B.53, adjust types to Postgres equivalents (D1 is SQLite-flavored; Postgres gives you real `enum`, `jsonb`, `uuid` types — use them, it's a strict upgrade).
3. `prisma migrate dev` to generate the initial migration; commit it (B.104 still applies — never hand-edit production schema).
4. If there's meaningful data already in the D1 instance from Phase 1–4 testing, write a one-off export/import script; if it's just test data, skip migration and reseed.

---

## C.6 Calling Workers AI without a Worker

Workers AI has a plain REST endpoint independent of Worker deployment:

```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
Authorization: Bearer {CLOUDFLARE_API_TOKEN}
```

`CloudflareAIProvider` (B.8) becomes a normal `fetch`-based HTTP client class inside the `ai` package, called from NestJS like any external API — no Worker, no `workerd`, no local runtime dependency. This is what lets you keep spending the $10K credits (B.10, B.100) from the new stack.

Given the earlier open question about Workers AI's code-generation quality ceiling for the Builder agent specifically: keep `ModelRouter` (B.9) routing code-gen tasks to whichever provider tests best, and treat `OPTIONAL_FALLBACK_PROVIDER` as a first-class option for that one task category, not just an outage fallback — B.62's "fallback when unavailable" framing can stay for most tasks, but code generation is worth deciding on quality grounds now that you're not locked into a single-runtime story.

---

## C.6a Queue replacement — pg-boss instead of BullMQ/Redis

BullMQ requires Redis, and a free-tier Redis instance (Upstash included) caps the number of concurrent connections — a real constraint once the worker, the API, and any local dev instance are all holding connections at once. Since Neon Postgres is already provisioned, use **pg-boss** instead: a job queue that runs entirely on Postgres via `SELECT ... FOR UPDATE SKIP LOCKED` (the same primitive C.7 below uses for session locking), with no second service and no separate connection budget to manage.

**One Neon-specific wrinkle:** Neon's default pooled connection string routes through PgBouncer in transaction mode, which does not support `LISTEN/NOTIFY`. Run pg-boss in **polling mode** (no `LISTEN/NOTIFY` dependency) — jobs are picked up on a configurable interval (a few seconds by default) rather than instantly. For this stage that latency is an acceptable tradeoff against standing up Redis. If sub-second job pickup becomes necessary later, that's the point to point pg-boss specifically at Neon's *direct* (unpooled) connection string to use `LISTEN/NOTIFY` — not needed now.

Same job list as B.14 (image generation, code generation, verification, repair, analytics processing), same "enqueue and return immediately" pattern from C.8. `seltra-worker` on Render polls pg-boss instead of consuming a Redis-backed BullMQ queue.

```text
Removed from the stack: Upstash / Redis, BullMQ
Added: pg-boss (npm package, no new infrastructure — runs against DATABASE_URL)
```

---

## C.7 Durable Objects replacement (the one genuine gap)

Durable Objects gave you, for free, a single-threaded execution context per conversation/agent-session — no other request could touch that object's state concurrently. Postgres doesn't give you that automatically; recreate the guarantee explicitly:

```sql
-- one row per active agent session/task
agent_sessions (
  id, task_id, status, locked_by, locked_at, state jsonb, updated_at
)
```

- Acquire a session with `SELECT ... FOR UPDATE SKIP LOCKED` (Postgres row-level lock) before an agent step runs.
- Release on step completion.
- If a step times out (B.65 retry policy), a cleanup job reclaims stale locks after a TTL.

This is more code than a Durable Object binding, but it's a well-understood pattern (it's how most job queues implement exclusive execution) and it's fully portable — no vendor lock-in, testable locally against your Neon instance.

---

## C.8 Deployment Separation (replaces B.106)

```text
Render:
  - seltra-api        (NestJS Web Service — handles HTTP/WebSocket)
  - seltra-worker      (Background Worker — pg-boss queue consumer, polling:
                         image generation, code generation, verification,
                         repair, analytics jobs — per B.14's job list)
Vercel:
  - seltra-web          (Next.js merchant dashboard)
  - seltra-storefront   (Next.js generated-storefront runtime, if deployed
                          as its own app per B.18)

Neon:      Postgres (primary DB + pg-boss job queue, same instance)
Cloudflare: R2 (object storage) + Workers AI (model provider)
```

Long-running agent tasks (B.74) now flow: `HTTP request → NestJS controller → enqueue pg-boss job → return immediately → seltra-worker polls Postgres, picks up job → executes agent step → updates agent_sessions/agent_tasks → publishes event over WebSocket/SSE for the frontend to pick up`. This preserves B.74's "don't block the HTTP request for long-running work" requirement without Durable Objects, Cloudflare Queues, or a separate Redis service.

---

## C.9 Environment Variables (replaces B.102)

```text
DATABASE_URL               # Neon connection string (pooled — API/services)
DATABASE_URL_DIRECT        # Neon direct/unpooled connection (reserved for pg-boss
                            # if LISTEN/NOTIFY is enabled later; polling mode can
                            # reuse DATABASE_URL)

CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN       # for R2 + Workers AI REST calls
R2_BUCKET_NAME
R2_ACCESS_KEY_ID           # R2's S3-compatible credentials
R2_SECRET_ACCESS_KEY
R2_ENDPOINT

SESSION_SECRET
AI_PROVIDER
AI_MODEL_DEFAULT
AI_MODEL_REASONING
AI_MODEL_FAST
OPTIONAL_FALLBACK_PROVIDER
OPTIONAL_FALLBACK_API_KEY

WEB_ORIGIN                 # CORS
```

Never commit secrets (B.102's rule stands). Render and Vercel both have native env var management — use those, not `.env` files, for anything beyond local dev.

---

## C.10 Local Development (replaces B.101, B.103)

```bash
# API
cd apps/nest-api
pnpm install
pnpm prisma:generate
pnpm prisma:migrate     # applies the Prisma migration to DATABASE_URL
pnpm start:dev          # NestJS API on http://localhost:3001

# Worker (separate terminal)
cd apps/worker
pnpm start:dev

# Web
cd apps/web
pnpm dev                # next dev
```

Postgres alone (no Redis) can run locally via Docker Compose if you don't want to depend on live Neon during development — optional, given Neon's free tier already scales to zero when idle. pg-boss runs against the same `DATABASE_URL` as everything else, so there's nothing extra to stand up.

---

## C.11 What stays exactly as specified in Part B

For clarity, nothing below changes:

- B.1–B.3 (build directive, product scope, target experience)
- B.20–B.34 (Store Engine, Design Engine, Generative UI rules, all agent responsibilities)
- B.36–B.52 (verification, repair, execution loop, task states, events, memory, prompt/output schemas)
- B.55–B.61 (auth, tenancy, security, approval, cost tracking, budget)
- B.63–B.73, B.76 (observability, error handling, retry, workspace abstraction, project structure, config, commerce/payment abstractions, image system, cache, search, agent run record)
- B.77–B.99 (all vertical slices, coordination model, artifact pipeline, visual quality loop, testing, golden prompts, evaluation, cost optimization)
- B.105, B.108–B.122 (CI shape, IDE rules, overengineering guardrails, phase plan, all definitions of done, all production capabilities, final architectural principle, Codex start command intent, definition of success)

Only the *execution substrate* changed. The product and the agent architecture did not.

---

## C.12 Ownership-check convention (from the service extraction)

Every service with a `getOwned(id, merchantId)`-shaped method — `StoreService`, `TaskService`, and any future service following the same pattern (products, conversations, previews) — must distinguish "resource doesn't exist" from "resource exists but belongs to another merchant." Collapsing both to `null` loses the 404-vs-403 distinction at the route layer and is a tenancy-adjacent bug (B.56), not just a style issue.

Standard shape, applied consistently across services:

```ts
type OwnedResult<T> =
  | { status: "ok"; value: T }
  | { status: "not_found" }
  | { status: "forbidden" };

async getOwned(id: string, merchantId: string): Promise<OwnedResult<T>> {
  const resource = await this.repo.getById(id);
  if (!resource) return { status: "not_found" };
  if (resource.merchantId !== merchantId) return { status: "forbidden" };
  return { status: "ok", value: resource };
}
```

Routes (Hono today, NestJS controllers after the Part C swap) map `not_found` → 404 and `forbidden` → 403. This is a repository-layer-independent convention — it holds unchanged whether the repository is in-memory or Prisma-backed, so it should be finalized in the service layer now, before Prisma repositories are written against it.

Repository methods should also be explicit rather than a single overloaded `save()`: separate `create()` and `update()`, so the future Prisma implementation maps directly to `prisma.<model>.create()` / `.update()` without inferring intent from whether an `id` is already set.

# END — PART C