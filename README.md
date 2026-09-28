# Seltra v5

Seltra turns a merchant's business brief into generated application source, runs it in a workspace-isolated Cloudflare Sandbox, and verifies the live preview with Cloudflare Browser Run. Application structure comes from business intent; there is no fixed page or section catalog.

## Repository layout

- `apps/web` — merchant workspace, live preview and source-file viewer.
- `apps/nest-api` — control plane, PostgreSQL/Prisma records, and authenticated sandbox client.
- `apps/worker` — pg-boss task runner and registered agent flows.
- `apps/sandbox-worker` — Cloudflare Sandbox, Browser Run and R2 artifact service.
- `packages/agents` — typed Agent/Task/Crew/Flow runtime and specialist agents.
- `packages/ai` — Workers AI provider abstraction.
- `packages/sandbox` — sandbox API contracts, authenticated client and path checks.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `CLOUDFLARE_ACCOUNT_ID-1`/`CLOUDFLARE_API_TOKEN-1` for execution infrastructure, and `CLOUDFLARE_ACCOUNT_ID-2`/`CLOUDFLARE_API_TOKEN-2` for Workers AI. The `-1` and `-2` suffixes are part of the environment variable names.
2. Deploy the sandbox Worker with `pnpm deploy:sandbox-worker`. It deploys with account 1, binds the account 1 R2 bucket from `R2_BUCKET_NAME`, writes `SANDBOX_WORKER_URL`, and sets the sandbox shared token plus account 2 Workers AI credentials as Worker secrets. No token values are printed.
3. Start the local sandbox bridge and Container with `pnpm local:sandbox`. The launcher temporarily loads account 1 credentials for the remote R2/Browser Run bindings and account 2 credentials for Workers AI from the root `.env`; it removes the temporary `.dev.vars` file when Wrangler exits. `wrangler dev` keeps the Worker and Container local. To run with local simulated bindings too, use `pnpm local:sandbox -- --local`. Accept the selected Meta vision model's license in account 2 before running visual evaluations.
4. Apply the Prisma migrations and generate the client:

   ```bash
   pnpm install
   pnpm --filter @seltra/nest-api prisma:generate
   pnpm --filter @seltra/nest-api prisma:migrate
   ```

5. Start the control plane, web app, and task worker:

   ```bash
   pnpm dev
   ```

The sandbox service can also be started directly with `pnpm --filter @seltra/sandbox-worker dev` after configuring `.dev.vars` and Wrangler account credentials. The root `pnpm local:sandbox` helper reads the role-suffixed credentials without printing or persisting their values. Account 1 owns the sandbox execution infrastructure and R2/Browser Run bindings; account 2 is used only for Workers AI model calls.

## Build verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

Production publishing is not wired to a hosting provider. The API reports preview work as awaiting a production publisher and merchant approval instead of marking a preview as published.

## Specialist and commerce runtime

The worker registers a Supervisor, Business Analyst, Planner, optional Researcher, Commerce, Content, Asset, Designer, Builder, Browser, Verifier, Visual Critic and Repair agents. The Supervisor selects the initial-build or iterative-change flow. Research is conditional; its current implementation explicitly does not claim live web search or current regulatory/provider facts. Commerce reads the merchant's existing products, collections and commerce records through store-scoped tools; those reads are recorded in the agent run trace.

The Nest API exposes merchant-scoped commerce records at `/stores/:storeId/commerce/:kind` for `services`, `appointments`, `orders`, `quotes`, `inventory`, `customers`, `fulfillment`, `service-cases`, `production`, `tables`, `menu-items` and `subscriptions`. Create with `POST` and `{ "data": { ... } }`, list with `GET`, and update `data` or a valid lifecycle `status` with `PATCH /:kind/:recordId`. Records are business state, not payment processing: payment, shipping, notifications and production integrations must be configured separately before the generated application can claim those operations are live.

The workspace, observability, and commerce Prisma migrations have been applied to the configured Neon database. The sandbox deployment command is account-explicit and validates the account 1/account 2 split before provisioning.
