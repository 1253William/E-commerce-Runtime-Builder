# SELTRA V5 --- REAL AGENTIC COMMERCE APPLICATION PLATFORM

## Authoritative Engineering Specification for Codex / GitHub Copilot

**Version:** V5 Production Application Platform --- Harness + Sandbox +
Agent Runtime + Design Intelligence + Deployment + Operations
**Status:** PRODUCTION BUILD CONTRACT --- BUILD NOW **Repository:**
`E-commerce-Runtime-Builder` **Product:** Seltra v5 **Target:**
Lovable-class AI application generation, deployment, and conversational
evolution for commerce **Primary language:** TypeScript **Runtime
control plane:** Node.js + NestJS + PostgreSQL/Prisma + pg-boss
**Execution plane:** Cloudflare Sandbox / Containers **Web:** Next.js
**AI:** Cloudflare Workers AI through a provider abstraction
**Storage:** R2 for assets/artifacts where appropriate **Queue:**
pg-boss on PostgreSQL

------------------------------------------------------------------------

# 0. READ THIS FIRST --- NON-NEGOTIABLE DIRECTIVE

This document is the implementation contract for the current
`E-commerce-Runtime-Builder` repository.

The repository already proves the central Seltra v5 architectural
breakthrough:

``` text
Merchant intent
    ↓
Supervisor / Orchestrator
    ↓
Planner
    ↓
Designer
    ↓
Builder
    ↓
Workspace
    ↓
Runtime
    ↓
Repair / Verification
```

The current output can still be visually weak, and the production
execution/release layer is incomplete. The repository already contains
real sandbox, AI, browser-observation, and agent-runtime foundations.
This specification upgrades those foundations into a production
application platform.

## The seven production upgrades MUST happen in this order

### 1. Real sandbox/workspace execution

The Builder must become a real coding agent capable of creating and
editing files, installing packages, running commands, starting an
application, reading errors, and iterating inside an isolated sandbox.

### 2. Build Integrity Engine

Generated files are not considered an application until Seltra proves
filesystem integrity, imports/exports, dependencies, package-manager
consistency, framework validity, type/syntax validity, routes, assets,
configuration, build output, and runtime startup.

Known failures must be routed to deterministic fixes before model
repair.

### 3. Native agent runtime

Refactor the current multi-agent implementation into explicit `Agent`,
`Task`, `Crew`, `Flow`, `Tool`, `Run`, `Observation`, `Guardrail`,
`Artifact`, and `Policy` primitives.

Do NOT install CrewAI as the core framework. Seltra is
TypeScript/NestJS. Borrow the useful architecture: specialized agents,
explicit tasks, crews for collaboration, flows for deterministic
orchestration/state, and a supervisor above them.

### 4. Real browser + functional verification

The system must inspect the actual running application using real
browser automation, screenshots, DOM, console, network, routes, and
interactions.

### 5. Design intelligence + visual critic

Only after real execution and browser verification exist, close the
visual quality loop:

``` text
Design reasoning
    ↓
Real code
    ↓
Real runtime
    ↓
Real browser
    ↓
Screenshots / DOM / console / network
    ↓
Visual + functional critique
    ↓
Targeted repair
    ↓
Re-run
```

### 6. Production App Runtime + Deployment

A sandbox preview is NOT production. Seltra must build an immutable,
deployable production artifact, provision the required runtime/data
contracts, run production smoke tests, bind domains and environment
configuration, publish atomically, monitor health, and support rollback.

### 7. Production operations + conversational evolution

After publication, the merchant must be able to say "change my store",
"add a booking flow", "change pricing", "add a product", "change the
theme", or "fix this issue". Seltra must evolve the existing production
application through a new revision, verify it, and promote it without
destroying the live revision.

The goal is no longer merely a **commerce-native Lovable-style
builder**. The goal is a **commerce-native AI application platform that
can generate, verify, deploy, operate, and evolve real production
applications**.

------------------------------------------------------------------------

# 1. ABSOLUTE V5 PRODUCT PRINCIPLE

Seltra v5 is **not** a template engine, component selector, theme
selector, or deterministic single-page storefront generator.

It is:

> **An AI-native application builder for commerce and commerce-enabled
> businesses.**

A merchant describes what the business is, what customers should be able
to do, what the business needs operationally, what the brand should feel
like, and what workflows matter.

Seltra determines:

``` text
business understanding
→ application type
→ information architecture
→ capabilities
→ workflows
→ data requirements
→ design direction
→ application plan
→ code
→ runtime
→ verification
→ repair
→ publish
```

The generated application can be:

-   storefront
-   multi-page commerce application
-   POS
-   restaurant ordering application
-   service booking application
-   tailoring/custom-order application
-   printing workflow
-   repair workflow
-   pre-order application
-   post-order service application
-   customer portal
-   dashboard
-   calendar
-   wizard
-   portfolio
-   catalog
-   composite business application
-   combinations of the above

The application shape is determined by business intent.

## Forbidden architecture

Do not build:

``` text
prompt
→ vertical
→ template
→ predefined sections
→ render
```

Do not make the v5 Builder depend on a registry such as:

``` text
HeroSection
ProductGrid
Testimonials
FAQ
Footer
```

Existing v4 UI assets may be studied or reused where independently
useful, but they MUST NOT become the architectural boundary of v5.

Do not make a `templateId`, `layoutId`, `sectionId`, or
`componentCatalog` the primary representation of a generated
application.

Components may exist inside generated code because normal React
applications use components. The distinction is critical: **v5 generates
the application and its code; it does not choose from a fixed Seltra
component/template catalog.**

------------------------------------------------------------------------

# 2. CURRENT REPOSITORY REALITY

The current repository is the `E-commerce-Runtime-Builder` proof
implementation.

Relevant structure currently includes:

``` text
apps/
  web/              Next.js workspace UI
  nest-api/         NestJS control/API plane
  worker/           pg-boss worker
  api/              older Cloudflare/Hono runtime kept for migration/reference

packages/
  agents/           current agent implementations
  ai/               AI provider/model abstraction
  database/         earlier Drizzle/D1 schema
  shared/           contracts and shared types
```

The current `packages/agents/src/index.ts` contains:

``` text
Planner
Designer
Builder
StoreEngine
Browser
Verifier
Repair
Orchestrator
```

The current implementation demonstrates the architecture but contains
intentionally provisional behavior that MUST be removed.

## Current implementation defects to eliminate

### Builder is not yet a real coder

The current Builder constructs an in-memory `application` object with
hardcoded example products, palette, hero copy, sections, routes, and
file names.

That is a prototype artifact, not the final architecture.

### Browser is now partially real

The repository contains a real browser observation path through the
sandbox/browser implementation, including desktop/mobile observation,
screenshots, DOM, console and network signals.

This must be treated as a production foundation, not as a completed
verification system. The remaining work is to make browser observations
durable, route-aware, interaction-aware, and sufficient for release
gates.

### Verifier is still insufficient for production

The current Verifier consumes real browser observations but its
acceptance logic is still too shallow for production. It must
additionally enforce the Build Integrity Engine, application acceptance
criteria, critical user flows, accessibility basics, security
headers/configuration, production health checks, and release-specific
smoke tests.

### Repair is partially real but not release-safe

The current Repair agent edits real sandbox files and can run a build,
but its result contract must not report repair success merely because a
command completed. A repair is successful only when the workspace
changed and the same failed acceptance criteria pass after re-build and
re-verification.

### AI provider is real but must be hardened

The repository already contains a real Cloudflare AI provider
abstraction. Keep it, but productionize provider selection,
structured-output validation, retries, timeouts, usage accounting, model
fallback policy, and provider health reporting.

No production path may silently substitute fixture or placeholder model
responses.

### Worker execution is real but release telemetry must become authoritative

The current worker already executes registered flows and persists agent
steps/tool observations.

Every lifecycle event must remain evidence-backed. In particular:

``` text
build.completed
verification.completed
repair.completed
publish.completed
health.check.passed
```

MUST only be emitted after the corresponding real operation succeeds.

Do not use event names to imply work that has not happened.

### Agent runtime is partially refactored

The repository already contains AgentRegistry/AgentRuntime/Flow-style
execution in the worker. Complete the migration so orchestration never
constructs agents directly, every tool is policy-controlled, and every
run/step/observation has durable state.

------------------------------------------------------------------------

# 2A. CURRENT REPOSITORY LAUNCH-BLOCKER GAP LIST

The attached repository is no longer a pure proof-of-concept. It already
has a real SandboxProvider, sandbox worker, Cloudflare AI provider,
browser observation path, AgentRuntime/Registry/Flow execution, build
preflight, failure classification, Prisma workspace/agent observability
records, and a real workspace UI.

The following items are therefore the **remaining launch blockers** and
must be fixed rather than re-architected away.

## Builder

The current Builder still contains prototype constraints that conflict
with the V5 product goal:

``` text
at most 4 routes
at most 8 files
no extra dependencies
```

These limits must be removed from production generation.

The Builder must use adaptive budgets and the ApplicationPlan to
determine project size.

## Dependency resolution

The Builder currently has logic capable of filling a missing dependency
with `"latest"`.

Production generation must never resolve an unpinned dependency from
`latest`.

The exact lockfile must belong to the revision that is verified and
deployed.

## Package manager

The current runtime executes `npm install` / `npm run build` for
generated applications.

The production contract must either:

1.  standardize the supported generated profile on npm and always
    produce a `package-lock.json`, or
2.  fully support pnpm and npm as separate profiles.

Do not create a mixed package-manager project.

The chosen manager must be recorded in `RuntimeManifest`.

## Repair result correctness

The current Repair path can perform a real build after edits but its
result contract must not leave:

``` text
fixed = false
```

when the repair actually resolved the verification failure.

Repair success must be determined only by:

``` text
workspace changed
+
relevant build passed
+
relevant verification passed
```

## Preview verification

A successful HTTP response from a preview URL is not sufficient as final
verification.

Production readiness requires the real browser observation path:

``` text
routes
DOM
screenshots
console
network
interactions
responsive viewports
```

The existing browser provider must become the authoritative source for
verification.

## Publishing

The current application service can return an "awaiting approval"
response while explicitly indicating that a production publisher is
still required.

That is not production publishing.

Implement the ProductionRuntimeProvider, immutable artifact, deployment
record, promotion, health check, and rollback contract defined in this
document.

## Authentication

The current workspace UI uses a local session representation and
merchant headers.

That is acceptable only for controlled local development.

Production must use real authentication and server-side authorization.

Never use a browser-supplied merchant ID as the sole authorization
proof.

## Authorization fallback

Any controller fallback such as:

``` text
merchant_1
```

must be removed from production paths.

Missing authentication must return an authentication/authorization
error, not a default tenant.

## Production data access

The generated application must not receive the control-plane
`DATABASE_URL`.

Commerce and application data must flow through the approved runtime/API
boundary.

## Snapshot storage

Workspace snapshots may be represented as files during development, but
production-scale source archives and binary artifacts should be stored
in R2/object storage with database references and hashes.

Do not make PostgreSQL JSON blobs the long-term storage mechanism for
every generated source file.

## Release identity

Every live application must point to one immutable revision.

At minimum:

``` text
applicationId
revisionId
artifactId
deploymentId
environment
```

must be available to the control plane.

## Production launch rule

Do not open the system to real merchants merely because:

``` text
agents pass
sandbox works
preview renders
```

Launch only after:

``` text
generate
→ verify
→ release
→ deploy
→ health check
→ smoke test
→ rollback
→ conversational edit
→ redeploy
```

has passed on the golden production benchmark.

# 3. TARGET ARCHITECTURE

The final v5 architecture has five planes.

``` text
                         SELTRA V5

┌──────────────────────────────────────────────────────────────┐
│  1. EXPERIENCE PLANE                                         │
│  Next.js Workspace UI                                        │
│  Chat + agent progress + preview + code + files + publish    │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│  2. CONTROL / SUPERVISOR PLANE                               │
│  NestJS API + Flow Engine + Agent Registry + Policies        │
│  Tasks + Runs + Memory + Events + Usage                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│  3. AGENT / HARNESS PLANE                                    │
│  Agents + Crews + Tasks + Tools + Context + Guardrails       │
│  Model routing + observations + evaluation                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│  4. EXECUTION PLANE                                          │
│  Cloudflare Sandbox                                          │
│  Filesystem + shell + package manager + processes + server   │
│  isolated workspace per project                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│  5. OBSERVATION / QUALITY PLANE                              │
│  Browser + screenshots + DOM + console + network + tests     │
│  Functional verifier + visual critic + repair loop           │
└──────────────────────────────────────────────────────────────┘
```

The central loop is:

``` text
USER INTENT
   ↓
UNDERSTAND
   ↓
PLAN
   ↓
DESIGN
   ↓
BUILD
   ↓
EXECUTE
   ↓
OBSERVE
   ↓
VERIFY
   ↓
REPAIR
   ↓
OBSERVE
   ↓
APPROVE / PUBLISH
```

This is inspired by the harness concept: model capability alone is
insufficient. Seltra supplies tools, state, memory, execution,
verification, policy, and observability around the model. Databricks
describes this broader direction as a harness/meta-harness layer that
composes agents, controls actions, and provides shared execution and
observability.
[citeturn1search1turn1search2](https://www.databricks.com/blog/ai-harness)

ReAct is also relevant as a behavioral pattern: reasoning and acting
should be interleaved so observations can update the next action rather
than forcing the entire task into one static plan.
[citeturn0academia36](https://arxiv.org/abs/2210.03629)

------------------------------------------------------------------------

# 4. EXECUTION PLANE --- REAL CLOUDflare SANDBOX

## 4.1 Decision

Use Cloudflare Sandbox as the isolated execution substrate for generated
applications.

Cloudflare's current Sandbox SDK is explicitly designed for agents that
need real filesystems, shell commands, language runtimes, package
installation, tests, builds, background processes, persistent project
state, and service previews. Each sandbox runs in a separate VM with
filesystem, process, network, and resource isolation.
[citeturn0search3turn0search2](https://developers.cloudflare.com/agents/tools/sandbox/?utm_source=chatgpt.com)

Use the current Cloudflare Sandbox SDK API appropriate to the installed
package version. The repository MUST pin a known compatible version and
keep the integration behind an internal `SandboxProvider` abstraction so
SDK changes do not leak throughout the application.

Cloudflare currently documents a 1.0 preview alongside the stable SDK.
Prefer the current recommended API for a new implementation, but do not
mix stable and preview APIs in the same implementation.
citeturn0search4turn0search12

## 4.2 Important topology decision

The current control plane is NestJS. Do not rewrite the whole
application to Workers just to obtain Sandbox.

Create a dedicated Cloudflare execution service/Worker for Sandbox
access:

``` text
NestJS
  │
  │ authenticated internal API
  ▼
Seltra Sandbox Worker
  │
  ▼
Cloudflare Sandbox
  │
  ├── /workspace
  ├── processes
  ├── build
  └── preview server
```

Recommended repository addition:

``` text
apps/
  sandbox-worker/
    src/
      index.ts
      sandbox.service.ts
      auth.ts
      routes/
        workspace.ts
        files.ts
        commands.ts
        preview.ts
        snapshots.ts
```

The NestJS service must not directly own sandbox credentials or
arbitrary Cloudflare control-plane operations.

## 4.3 One sandbox per workspace

Every generated application workspace gets its own sandbox identity:

``` text
seltra-workspace-{workspaceId}
```

Never share one sandbox between unrelated merchants.

Cloudflare explicitly warns that sessions inside one sandbox share
filesystem/process state and are not a security boundary; separate
sandboxes are the isolation boundary for different users/workspaces.
citeturn0search2turn0search5

## 4.4 Sandbox filesystem

Canonical project root:

``` text
/workspace
```

Recommended generated application structure:

``` text
/workspace/
  package.json
  pnpm-lock.yaml or package-lock.json
  tsconfig.json
  next.config.*
  app/
  src/
  public/
  lib/
  data/
  styles/
  README.md
  .gitignore
  seltra/
    application.json
    business-intent.json
    design-direction.json
    build-manifest.json
    verification.json
```

`seltra/` contains machine-readable metadata for the Seltra runtime. The
application itself remains normal source code.

## 4.5 Sandbox tool contract

The Builder/Repair agent gets controlled tools, not unrestricted host
access.

Required tools:

``` text
fs.list
fs.read
fs.write
fs.edit
fs.delete
fs.mkdir
fs.move
fs.copy

shell.exec
shell.stream
process.start
process.stop
process.list

package.install
package.remove

build.run
test.run
lint.run

git.status
git.diff
git.checkout

preview.start
preview.stop
preview.status
```

Cloudflare documents file operations, command execution, background
processes, service previews, and sandbox filesystem management directly.
citeturn0search6turn0search9turn0search11

## 4.6 Never allow raw host commands

No agent may receive a tool such as:

``` text
execute_on_host(command)
```

All code-generation execution is sandbox-scoped.

Do not interpolate untrusted user/model text into shell commands. Prefer
argv-based execution where supported by the selected Sandbox SDK
version. Validate paths and commands. Cloudflare explicitly documents
command injection risks and recommends validation or structured file
APIs. citeturn0search9turn0search2

## 4.7 Development and runtime sessions

Separate agent-development credentials from application-runtime
credentials.

``` text
DEV EXECUTION
  Builder / Repair
  package install
  tests
  build
  code tools

RUNTIME EXECUTION
  generated app
  preview server
  safe runtime env only
```

Cloudflare's session guidance specifically describes using separate
execution contexts to keep agent credentials away from generated
application runtime. Sessions are not a security boundary; they share
the sandbox filesystem/process space. citeturn0search5

For stronger isolation between untrusted generated applications, create
separate sandboxes rather than relying on sessions.

## 4.8 Network policy

Default policy:

``` text
Outbound network: deny by default where practical
Allowlist: package registries, approved image sources, approved commerce APIs, approved Seltra endpoints
Production databases: NEVER directly accessible from coding sandbox
Merchant secrets: NEVER injected into coding sandbox
Cloudflare API token: NEVER injected into generated application runtime
```

The agent should interact with commerce data through Seltra tools/APIs,
not by obtaining the production database URL.

## 4.9 Resource limits

Every sandbox/run must have:

``` text
max execution time
max CPU
max memory
max disk
max command duration
max processes
max concurrent browser sessions
max repair iterations
max package-install retries
max network budget
```

All limits must be configurable.

------------------------------------------------------------------------

# 5. WORKSPACE AS THE SOURCE OF TRUTH FOR GENERATED APPLICATION CODE

The database stores metadata about the application workspace.

The sandbox stores the actual generated application.

This rule is mandatory:

> **Database = business state + agent state + workspace metadata.
> Sandbox = application source/runtime state.**

Do not serialize the entire application into one JSON `application`
object and pretend that is the generated project.

A workspace should contain:

``` text
Workspace
├── merchant context
├── business intent
├── application requirements
├── design direction
├── sandbox identity
├── current preview
├── current revision
├── snapshots
├── agent runs
├── evaluations
└── publication state
```

The generated source lives in the sandbox.

------------------------------------------------------------------------

# 5A. PRODUCTION APPLICATION CONTRACT

This section is mandatory. It is the boundary between "AI builder" and
"real production application platform".

A generated project is a **production application candidate**, not
merely source code.

The generated application must have a machine-readable contract:

``` text
/seltra/application.json
/seltra/business-intent.json
/seltra/application-plan.json
/seltra/design-direction.json
/seltra/build-manifest.json
/seltra/runtime-manifest.json
/seltra/data-contract.json
/seltra/integration-contract.json
/seltra/verification.json
/seltra/release-manifest.json
```

The source code remains normal application code. These files are
metadata for Seltra's control plane and deployment system.

## Production application lifecycle

``` text
DRAFT
  ↓
BUILDING
  ↓
PREVIEW
  ↓
VERIFIED
  ↓
RELEASE_CANDIDATE
  ↓
APPROVAL_REQUIRED
  ↓
DEPLOYING
  ↓
LIVE
  ↓
DEGRADED
  ↓
ROLLBACK / REPAIR
  ↓
LIVE
```

Never equate `BUILD_SUCCESS` with `LIVE`.

## Production runtime separation

The sandbox is for:

``` text
generation
dependency installation
tests
builds
preview servers
browser verification
repair
```

Production is a separate runtime.

``` text
                  SELTRA CONTROL PLANE
                         │
          ┌──────────────┴──────────────┐
          │                             │
      PREVIEW                       PRODUCTION
          │                             │
   Cloudflare Sandbox          ProductionRuntimeProvider
          │                             │
   real app preview             immutable artifact
          │                             │
   browser verification         live application
```

A generated application MUST NOT be served to customers from the Builder
sandbox.

A production deployment MUST NOT depend on an interactive agent session,
temporary workspace process, local filesystem, or preview URL.

## Supported production profile

For the first production release, Seltra should optimize for one fully
supported web runtime profile rather than pretending every framework is
production-ready.

The initial supported profile is:

``` text
TypeScript
React
Next.js
Node-compatible/serverless runtime
Seltra commerce/runtime APIs
```

Application freedom means freedom of application structure, workflows,
pages, components, interactions, data presentation, and business logic
inside this supported runtime contract.

It does NOT mean allowing the model to invent an untested production
runtime.

Additional frameworks can be introduced only after they receive their
own runtime adapter, build adapter, browser adapter, deployment adapter,
security profile, and golden benchmarks.

## Application runtime manifest

Minimum:

``` ts
interface RuntimeManifest {
  runtimeProfile: string;
  framework: string;
  frameworkVersion: string;
  packageManager: "pnpm" | "npm";
  buildCommand: string;
  startCommand: string;
  healthPath: string;
  requiredRoutes: string[];
  requiredEnv: Array<{
    name: string;
    scope: "build" | "server" | "public";
    required: boolean;
    secret: boolean;
  }>;
  dataAccess: {
    mode: "seltra-api" | "managed-app-data";
    tenantScoped: boolean;
  };
  integrations: string[];
  artifactId?: string;
}
```

The runtime manifest is generated and verified. Deployment does not
guess how the application should start.

## Application identity

Every deployed application has:

``` text
applicationId
merchantId
storeId
workspaceId
revisionId
environmentId
deploymentId
```

These identifiers must be carried through logs, runtime requests,
events, and deployment records.

The live application must always be attributable to an immutable
`revisionId`.

## Tenant isolation

Every request to a generated production application must resolve tenant
identity through a trusted runtime mechanism.

Never trust:

``` text
?merchantId=
x-merchant-id supplied by the browser
client-side store IDs
hidden form fields
```

for authorization.

The production runtime must derive identity from authenticated session,
signed runtime credentials, domain mapping, or an equivalent trusted
server-side mechanism.

## Data access boundary

Generated applications MUST NOT receive:

``` text
DATABASE_URL
PostgreSQL credentials
Cloudflare account tokens
R2 master credentials
pg-boss credentials
control-plane secrets
```

Generated applications access Seltra commerce capabilities through
typed, tenant-scoped APIs/tools.

For application-specific data, use a managed application-data boundary:

``` text
Generated App
     ↓
App Runtime Gateway
     ↓
tenant + application + revision authorization
     ↓
managed app data
```

The control-plane database is never the generated application's direct
database.

## Data contract

The planner/commerce agent must determine whether the application needs
persistent data.

The data contract must describe:

``` text
entities
fields
relationships
indexes
constraints
ownership
read/write operations
audit requirements
retention
```

The builder may generate schema/migration files only within the
supported data contract.

Production data migrations must be:

``` text
versioned
forward-compatible where possible
reviewable
idempotent
backed up where required
tested against a production-like database
```

Never allow an AI edit to silently drop or destroy production data.

## Authentication and authorization

If the application requires accounts, the plan must explicitly declare:

``` text
anonymous customer
authenticated customer
merchant staff
administrator
operations user
```

Authorization must be enforced server-side.

UI hiding is not authorization.

Production apps must have:

``` text
session handling
logout
access control
server-side authorization
tenant isolation
CSRF protection where applicable
secure cookie policy
rate limiting for sensitive actions
```

## Commerce integration boundary

Commerce capabilities remain Seltra-owned:

``` text
products
collections
inventory
customers
orders
payments
fulfillment
appointments
services
quotes
promotions
notifications
```

Generated applications consume these through stable contracts.

The Builder may create UI and orchestration around commerce operations,
but it must not invent a second incompatible commerce database.

## Payment safety

Payment capability is a production release blocker.

The generated app may use payment integrations only through approved
Seltra payment adapters.

Rules:

``` text
test mode ≠ live mode
merchant approval required before live payment activation
webhook signatures verified
idempotency keys required for money-moving operations
payment secrets server-side only
no raw card data stored by generated app
```

A successful preview payment flow does not authorize production payment
activation.

## External integrations

Every integration must declare:

``` text
provider
purpose
required credentials
secret/public classification
environment
health check
failure behavior
webhook requirements
retry policy
```

If credentials are missing, the application must expose a truthful
configuration state rather than pretending the integration is active.

## Files/uploads

Production file uploads must use approved storage paths and scoped
upload tokens.

Do not proxy large files through the control plane when direct signed
upload/download is appropriate.

Validate:

``` text
content type
file size
extension
ownership
storage key
access policy
```

## Notifications

Email/SMS/push workflows must be explicit capabilities.

Every production notification should have:

``` text
template/version
recipient
purpose
delivery status
provider message ID where available
retry policy
unsubscribe/consent handling where applicable
```

## Runtime health

Every production application must expose a health contract.

Minimum:

``` text
GET /health
```

The health response must distinguish:

``` text
application healthy
dependency degraded
application unhealthy
```

Do not report healthy solely because the process is alive.

Critical dependencies for the application's declared capabilities must
be checked.

## Error handling

Production applications must have:

``` text
route-level error boundary
server error handling
user-safe error messages
request correlation ID
structured server logging
404 handling
loading states
empty states
retry states
offline/degraded behavior where relevant
```

Never display stack traces, secrets, SQL errors, or internal credentials
to customers.

## Production observability

Every production request should be traceable to:

``` text
applicationId
merchantId
storeId
revisionId
requestId
environment
route
status
latency
```

Track at minimum:

``` text
request errors
5xx rate
latency
health checks
deployment failures
payment failures
webhook failures
background job failures
asset failures
runtime exceptions
```

The workspace UI should surface production incidents without exposing
secrets.

## Immutable artifacts

A production deployment is an immutable artifact.

The artifact must include:

``` text
source revision
dependency lockfile
build output
runtime manifest
environment contract
data migration version
verification report
artifact hash
createdAt
```

Do not rebuild the same revision differently at publish time.

Build once, verify the artifact, then promote that exact artifact.

## Promotion rule

``` text
workspace revision
      ↓
preview build
      ↓
preview verification
      ↓
release candidate
      ↓
production build/artifact
      ↓
production smoke verification
      ↓
merchant approval
      ↓
atomic promotion
```

The production artifact must be the artifact that was verified.

## Rollback rule

Every successful deployment must retain the previous known-good
revision.

Rollback must be:

``` text
select previous revision
→ verify artifact exists
→ promote previous artifact
→ health check
→ mark current deployment rolled back
```

Rollback must not require the AI to regenerate source code.

## Production edit rule

A conversational production edit creates a new revision.

``` text
LIVE revision 12
     ↓
merchant: "change my homepage hero"
     ↓
workspace revision 13
     ↓
edit
     ↓
build
     ↓
preview
     ↓
browser verification
     ↓
release candidate
     ↓
approval
     ↓
LIVE revision 13
```

Revision 12 remains untouched until revision 13 is successfully
promoted.

If revision 13 fails, revision 12 remains live.

# 6. DATABASE MODEL UPGRADE

Keep existing Merchant, User, Store, Product, Collection, Conversation,
Message, Task, Memory, ModelUsage, Preview, AgentSession where useful.

Add explicit entities conceptually equivalent to:

``` text
Workspace
WorkspaceSnapshot
AgentRun
AgentStep
ToolExecution
Artifact
Observation
Evaluation
```

Recommended relationships:

``` text
Merchant
  └── Store
        └── Workspace
              ├── AgentRuns
              │     └── AgentSteps
              │           └── ToolExecutions
              ├── Snapshots
              ├── Artifacts
              ├── Observations
              ├── Evaluations
              └── Preview
```

## Workspace

Minimum fields:

``` text
id
merchantId
storeId
name
status
sandboxId
currentRevisionId
applicationType
businessIntent JSON
designDirection JSON
requirements JSON
createdAt
updatedAt
```

## WorkspaceSnapshot

``` text
id
workspaceId
revision
label
sandboxSnapshotRef
createdByRunId
createdAt
```

## AgentRun

``` text
id
workspaceId
taskId
flowId
status
startedAt
completedAt
currentStep
input JSON
output JSON
error JSON
cost
```

## AgentStep

``` text
id
runId
agentId
taskId
status
sequence
input JSON
output JSON
startedAt
completedAt
error JSON
```

## ToolExecution

``` text
id
stepId
toolId
status
arguments JSON
result JSON
startedAt
completedAt
exitCode
stdoutRef
stderrRef
```

## Observation

``` text
id
runId
kind
route
viewport
artifactRef
payload JSON
createdAt
```

Kinds:

``` text
browser_screenshot
browser_dom
console
network
build
test
lint
runtime_health
visual_review
functional_review
```

## Evaluation

``` text
id
runId
kind
status
criteria JSON
findings JSON
severity
score JSON
createdAt
```

Do not store secrets in these tables.

------------------------------------------------------------------------

# 7. NATIVE CREWAI-INSPIRED AGENT RUNTIME

Do not import CrewAI.

Implement the useful concepts natively in TypeScript.

## 7.1 Agent

An Agent is a role with:

``` text
id
name
purpose
instructions
model policy
tool policy
memory policy
output contract
budget policy
```

Example:

``` ts
interface SeltraAgent {
  id: string;
  role: string;
  goal: string;
  execute(task: AgentTask, runtime: AgentRuntime): Promise<AgentResult>;
}
```

## 7.2 Task

A Task is a concrete unit of work.

``` text
objective
inputs
expected output
acceptance criteria
assigned agent
dependencies
context policy
retry policy
```

Tasks must be explicit and observable.

## 7.3 Crew

A Crew is a cooperating group of agents available for a problem domain.

Example:

``` text
BuildCrew
├── Planner
├── Researcher
├── Designer
├── Commerce
├── Builder
├── Browser
├── FunctionalVerifier
├── VisualCritic
└── Repair
```

A crew does not automatically imply sequential execution.

## 7.4 Flow

A Flow controls state transitions, branching, retries, and termination.

The initial generation flow:

``` text
START
 ↓
UNDERSTAND
 ↓
PLAN
 ↓
DESIGN
 ↓
BUILD
 ↓
RUN
 ↓
INSPECT
 ↓
VERIFY
 ├── PASS → APPROVE / PUBLISH
 └── FAIL → REPAIR
               ↓
             RUN
               ↓
           INSPECT
               ↓
            VERIFY
```

Flows are deterministic control logic. Agents provide intelligence
inside the steps.

## 7.5 Supervisor

The Supervisor chooses and starts the appropriate flow/crew.

It should not contain all business logic.

Bad:

``` ts
const plan = await new Planner().execute(...)
const design = await new Designer().execute(...)
const build = await new Builder().execute(...)
```

Good:

``` ts
const flow = flowRegistry.resolve("application-build");
return flow.run(runContext);
```

## 7.6 Agent Registry

Create:

``` text
AgentRegistry
CrewRegistry
FlowRegistry
ToolRegistry
ModelRegistry
PolicyRegistry
```

Registration happens once at application bootstrap.

Agents are resolved by ID.

------------------------------------------------------------------------

# 8. AGENT ROLES

The following roles are the initial production set.

## Supervisor

Owns high-level routing.

Does not write application code.

## Intent / Business Analyst

Turns merchant language into a structured business understanding.

Output:

``` text
BusinessIntent
```

Must identify:

``` text
business type
vertical
customer segments
products/services
application types
workflows
commerce capabilities
fulfillment
payments
locations
constraints
unknowns
```

## Planner

Turns business understanding into an ApplicationPlan.

Must decide:

``` text
routes
surfaces
workflows
data needs
integrations
permissions
content requirements
assets
verification requirements
```

## Researcher

Used only when external or business knowledge is required.

Do not call research automatically for every request.

## Designer

Creates a **DesignDirection**, not a component list.

Output:

``` text
brand interpretation
visual character
information architecture
page intent
composition strategy
typography strategy
color strategy
image strategy
interaction strategy
responsive strategy
content hierarchy
commerce UX strategy
```

## Commerce Agent

Understands Seltra commerce APIs and business operations.

Must not access production DB directly.

It uses typed tools:

``` text
products
collections
inventory
customers
orders
payments
fulfillment
appointments
services
quotes
```

## Content Agent

Generates copy, labels, product descriptions, empty states,
instructions, and other content required by the application.

Avoid generic filler.

## Asset Agent

Finds, creates, transforms, or requests appropriate assets.

## Builder

The primary coding agent.

It writes actual application code in the sandbox.

## Browser Agent

Executes real browser operations against the preview.

## Functional Verifier

Checks whether application requirements actually work.

## Visual Critic

Evaluates screenshots and rendered application quality.

## Repair Agent

Uses observations and evaluations to modify the actual application code
in the sandbox.

Maximum default repair iterations: 3 per build cycle.

------------------------------------------------------------------------

# 9. AGENT TOOLING MODEL

Agents should not receive every tool.

## Planner tools

``` text
workspace.read_context
commerce.describe_capabilities
memory.search
```

## Designer tools

``` text
workspace.read_context
asset.search
memory.search
```

## Builder tools

``` text
fs.*
shell.*
package.*
build.*
test.*
preview.*
workspace.snapshot
```

## Commerce tools

``` text
commerce.products.*
commerce.collections.*
commerce.orders.*
commerce.inventory.*
commerce.payments.describe
commerce.fulfillment.describe
```

## Browser tools

``` text
browser.open
browser.goto
browser.click
browser.type
browser.scroll
browser.screenshot
browser.inspectDOM
browser.console
browser.network
browser.viewport
```

## Repair tools

``` text
fs.read
fs.edit
fs.write
shell.exec
build.run
test.run
browser.open
browser.screenshot
```

Tool access is policy controlled.

------------------------------------------------------------------------

# 10. TOOL CONTRACTS MUST BE STRUCTURED

Every tool has:

``` text
id
version
description
input schema
output schema
permissions
risk level
timeout
budget
```

No free-form shell tool should be exposed to agents without policy
enforcement.

Example:

``` ts
interface Tool<TInput, TOutput> {
  id: string;
  version: string;
  risk: "low" | "medium" | "high";
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}
```

Tool calls must be logged.

------------------------------------------------------------------------

# 11. REAL BUILD FLOW

## Step 1 --- Understand

Input:

``` text
merchant prompt
merchant profile
store context
conversation history
memory
```

Output:

``` text
BusinessIntent
```

Do not invent facts. Mark uncertainty.

## Step 2 --- Plan

Output:

``` text
ApplicationPlan
```

Example:

``` json
{
  "applicationType": ["storefront", "customer-ordering"],
  "routes": ["/", "/menu", "/product/:slug", "/cart", "/checkout", "/order/:id"],
  "capabilities": ["catalog", "cart", "checkout", "pickup", "delivery", "order-tracking"],
  "workflows": ["browse→cart→checkout→fulfillment→tracking"]
}
```

This is a plan, not generated code.

## Step 3 --- Design

Output:

``` text
DesignDirection
```

No fixed sections.

## Step 4 --- Build

Builder inspects workspace and creates/modifies real files.

It may:

``` text
create routes
create files
create React components
create CSS
create data adapters
create utilities
install dependencies
write tests
run build
fix errors
```

The Builder has application freedom.

## Step 5 --- Run

Start the generated application in the sandbox.

Example:

``` text
pnpm install
pnpm build
pnpm dev --hostname 0.0.0.0 --port 3000
```

The exact commands should be detected from the generated project rather
than hardcoded to one framework.

## Step 6 --- Browser

Open the real preview URL.

Collect:

``` text
desktop screenshot
mobile screenshot
DOM snapshot
console errors
network failures
route status
interaction results
```

## Step 7 --- Verify

Functional verifier checks acceptance criteria.

## Step 8 --- Visual Critic

Visual critic checks the rendered result.

## Step 9 --- Repair

Repair agent modifies files.

## Step 10 --- Re-run

Never declare success after a repair without re-running verification.

------------------------------------------------------------------------

# 12. REAL BROWSER REQUIREMENT

The Browser agent must stop returning simulated checks.

The implementation must use a real browser-capable system available to
the project.

Preferred order:

1.  Cloudflare Browser Rendering if available and appropriate for the
    deployed environment.
2.  A controlled Playwright-based browser service for local development
    / execution where required.
3.  An internal BrowserProvider abstraction so the implementation can
    change without changing agent contracts.

Required interface:

``` ts
interface BrowserProvider {
  open(url: string): Promise<BrowserSession>;
  screenshot(session: BrowserSession, options: ScreenshotOptions): Promise<ArtifactRef>;
  goto(session: BrowserSession, url: string): Promise<Observation>;
  click(session: BrowserSession, selector: string): Promise<Observation>;
  type(session: BrowserSession, selector: string, text: string): Promise<Observation>;
  scroll(session: BrowserSession, amount: number): Promise<Observation>;
  inspectDOM(session: BrowserSession): Promise<Observation>;
  inspectConsole(session: BrowserSession): Promise<Observation>;
  inspectNetwork(session: BrowserSession): Promise<Observation>;
  close(session: BrowserSession): Promise<void>;
}
```

No synthetic `checks: true` values.

------------------------------------------------------------------------

# 13. DESIGN INTELLIGENCE

The current screenshot demonstrates that the system can produce a
technically valid page but lacks enough design intelligence to approach
the desired quality bar.

Do not solve this by adding more predefined sections.

Solve it by improving the reasoning artifacts passed into the Builder.

## DesignDirection schema

``` text
brand
  personality
  audience
  positioning
  visual references

composition
  density
  hierarchy
  rhythm
  alignment
  asymmetry

color
  primary
  secondary
  accent
  surfaces
  text
  semantic states

 typography
  display
  heading
  body
  label
  numeric
  scale
  weight strategy

imagery
  role
  aspect ratios
  crop strategy
  focal points
  asset density

navigation
  information architecture
  primary actions
  secondary actions

interaction
  states
  transitions
  feedback
  loading
  empty
  error

responsive
  mobile strategy
  tablet strategy
  desktop strategy

commerce
  product discovery
  conversion hierarchy
  trust
  checkout
  fulfillment
```

The Designer must explain design decisions in structured data.

Example:

``` json
{
  "visualCharacter": ["editorial", "premium", "quiet"],
  "density": "airy",
  "composition": "image-led asymmetric",
  "navigation": "minimal",
  "primaryAction": "shop collection",
  "imageTreatment": "large editorial photography",
  "typography": "display-led hierarchy",
  "reasoning": [
    "The merchant positions the brand as premium and editorial.",
    "Large imagery should establish emotional identity before product density increases."
  ]
}
```

The Builder uses this as guidance, not a template.

------------------------------------------------------------------------

# 14. VISUAL CRITIC LOOP

This is the third major upgrade and MUST operate against the real
runtime.

``` text
Builder
 ↓
Preview
 ↓
Browser
 ↓
Screenshot
 ↓
Visual Critic
 ↓
Findings
 ↓
Repair
 ↓
Preview
 ↓
Browser
 ↓
Visual Critic
```

## Visual Critic inputs

``` text
original merchant intent
business intent
application plan
design direction
screenshots
DOM summary
viewport metadata
existing visual history
```

## Visual Critic output

``` text
critical findings
major findings
minor findings
strengths
recommended changes
confidence
```

Categories:

``` text
brand interpretation
visual hierarchy
composition
typography
spacing
color
imagery
content quality
navigation
responsive behavior
commerce UX
accessibility
consistency
```

Do not require the critic to return a single vague score.

Scores may be used for internal evaluation, but actionable findings are
the primary output.

------------------------------------------------------------------------

# 15. VISUAL QUALITY BENCHMARK --- LOVABLE-CLASS TARGET

This benchmark is an engineering target, not a claim about Lovable's
proprietary internals.

A generated application is not considered V5 quality merely because it
builds successfully.

## Gate A --- Technical integrity

Must pass:

``` text
0 build errors
0 uncaught runtime exceptions
0 critical console errors
all required routes resolve
no broken assets
no broken imports
no hydration failure
no obvious layout overflow
```

## Gate B --- Product completeness

For the prompt's required capabilities:

``` text
all core workflows executable
primary CTA works
navigation works
commerce actions work
forms validate
error states exist
loading states exist
empty states exist
```

## Gate C --- Visual quality

Target:

``` text
strong visual hierarchy
intentional composition
coherent typography
coherent spacing system
brand-specific visual identity
appropriate imagery
clear primary action
professional responsive behavior
no generic AI-generated look
```

Internal benchmark should evaluate each category on 0--5:

``` text
0 = broken / absent
1 = poor
2 = weak
3 = acceptable
4 = strong
5 = excellent
```

Target for the V5 golden set:

``` text
No category below 4
Average visual categories >= 4.2
No critical visual defect
No major visual defect left after repair loop
```

## Gate D --- Application freedom

At least one benchmark prompt must require a non-storefront application,
for example:

``` text
restaurant ordering
POS
custom tailoring workflow
repair tracking
service booking
```

The system must generate an application structure appropriate to the
request rather than forcing the result into a storefront homepage.

## Gate E --- Iterative editing

After generation, user should be able to say:

``` text
Make the hero more editorial.
Add a customer account page.
Change checkout to support pickup.
Add a measurement form.
Make mobile navigation a drawer.
```

Seltra must modify the existing workspace rather than regenerate the
entire application from scratch.

## Gate F --- Recovery

Deliberately introduce a defect into a generated project.

The system must:

``` text
observe defect
identify likely cause
edit files
rebuild
re-run browser verification
confirm resolution
```

A repair that does not modify the workspace is not a repair.

------------------------------------------------------------------------

# 16. GOLDEN PROMPT BENCHMARK SET

Create a repeatable dataset under:

``` text
/evals/golden-prompts/
```

Minimum prompts:

1.  Premium skincare storefront
2.  Ghanaian breakfast ordering application
3.  Premium fashion store
4.  Tailoring custom-order application
5.  Restaurant ordering + pickup/delivery
6.  Printing business quote/request workflow
7.  Electronics repair tracking application
8.  Bookstore catalog + checkout
9.  POS for a boutique
10. Service business booking application

Each evaluation contains:

``` text
prompt
expected business intent
minimum capabilities
minimum routes/surfaces
design expectations
functional acceptance tests
visual acceptance criteria
```

The evaluation harness should run the same prompts repeatedly and store
results.

------------------------------------------------------------------------

# 17. ITERATIVE EDIT BENCHMARK

Each golden prompt must have at least five follow-up modifications.

Example:

``` text
Initial:
Build a premium fashion store.

Edit 1:
Add a journal.

Edit 2:
Make the homepage more editorial.

Edit 3:
Add size selection and product variants.

Edit 4:
Add customer account and order history.

Edit 5:
Make mobile navigation a drawer and improve checkout.
```

The application must evolve in place.

The agent should inspect existing files before editing.

Do not regenerate blindly.

------------------------------------------------------------------------

# 18. APPLICATION VERSIONING

Every successful major agent operation should produce a snapshot.

``` text
revision 1 — initial build
revision 2 — visual repair
revision 3 — merchant edit
revision 4 — checkout update
```

Provide:

``` text
snapshot
restore
rollback
compare
changed files
```

The workspace UI should eventually expose this as Undo / History.

------------------------------------------------------------------------

# 19. CONTEXT AND MEMORY

Separate:

### Run state

Short-lived state needed to finish the current operation.

### Workspace memory

Stable decisions about the application:

``` text
brand decisions
approved design direction
merchant preferences
accepted routes
business rules
integration decisions
```

### Merchant memory

Durable facts/preferences relevant across workspaces/conversations.

Databricks similarly distinguishes session state from durable memory;
use this separation in Seltra rather than allowing every agent to replay
the entire conversation forever. citeturn1search4

Use context compaction/summarization when sessions grow.

Never send the entire workspace filesystem to every model call.

Agents should receive targeted context.

------------------------------------------------------------------------

# 20. MODEL ROUTING

Current environment:

``` text
AI_PROVIDER=cloudflare
AI_MODEL_DEFAULT=@cf/meta/llama-3.1-8b-instruct
AI_MODEL_REASONING=@cf/meta/llama-3.3-70b-instruct-fp8-fast
AI_MODEL_FAST=@cf/meta/llama-3.1-8b-instruct
```

Keep model selection behind `ModelRouter`.

Recommended policy:

``` text
intent          → fast/default
summarization   → fast/default
planning        → reasoning
design          → reasoning
build           → reasoning/code-capable configured model
repair          → reasoning/code-capable configured model
verification    → fast + deterministic checks
visual critique  → configured vision model
content         → fast/default
```

Do not hardcode unsupported vision/image model identifiers.

Add optional:

``` text
AI_MODEL_VISION=
AI_MODEL_CODE=
```

If unset, use the configured supported fallback strategy.

## Real Cloudflare provider

`CloudflareAIProvider` must call the actual Cloudflare Workers AI REST
endpoint using the account ID and API token in server-side code.

Endpoint pattern:

``` text
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}
```

The token must never be exposed to Next.js/browser code.

Implement:

``` text
generateText
generateStructured
streamText where supported
```

Validate structured outputs with Zod/JSON schema.

Retry transient provider errors with bounded exponential backoff.

Record:

``` text
provider
model
agent
run
input tokens if available
output tokens if available
latency
estimated cost
failure
```

------------------------------------------------------------------------

# 21. MODEL OUTPUT CONTRACTS

Every important agent output must be structured.

Minimum schemas:

``` text
BusinessIntent
ApplicationPlan
DesignDirection
BuildPlan
BuildResult
BrowserObservation
FunctionalEvaluation
VisualEvaluation
RepairPlan
```

Do not parse arbitrary prose when a typed contract is possible.

Example BuildResult:

``` json
{
  "status": "built",
  "changedFiles": ["app/page.tsx", "app/shop/page.tsx"],
  "commands": ["pnpm install", "pnpm build"],
  "build": {
    "passed": true,
    "errors": []
  },
  "preview": {
    "port": 3000,
    "url": "..."
  }
}
```

------------------------------------------------------------------------

# 22. OBSERVABILITY / HARNESS TELEMETRY

Every run must produce a trace-like event sequence.

Required event types:

``` text
task.created
task.started
flow.started
flow.step.started
agent.started
agent.completed
tool.started
tool.completed
model.started
model.completed
file.changed
build.started
build.completed
preview.started
preview.ready
browser.started
browser.observation
verification.started
verification.completed
visual.review.started
visual.review.completed
repair.started
repair.completed
snapshot.created
approval.requested
publish.started
publish.completed
task.completed
task.failed
```

Events must be truthful.

The UI should be able to reconstruct the progress timeline from these
events.

Databricks' current agent observability guidance emphasizes complete
traces, evaluation, production monitoring, and feedback as core quality
infrastructure. Seltra should implement the same principle in its own
lightweight telemetry layer rather than treating logs as an
afterthought. citeturn1search6turn1search0

------------------------------------------------------------------------

# 23. COST AND BUDGET CONTROL

Every AgentRun has a budget.

Budget dimensions:

``` text
model calls
estimated tokens
wall clock time
sandbox execution time
browser operations
repair attempts
```

Budget controller states:

``` text
normal
warning
critical
stop
```

Do not allow runaway repair loops.

Default:

``` text
max repair cycles = 3
max total agent steps = configurable
max model calls = configurable
```

------------------------------------------------------------------------

# 24. FAILURE AND RECOVERY

The system must distinguish:

``` text
model failure
provider failure
tool failure
sandbox failure
build failure
runtime failure
browser failure
verification failure
visual failure
merchant ambiguity
policy block
budget exhaustion
```

Each failure must have:

``` text
error code
human-readable message
retryable flag
retry count
next action
```

Do not mark a task completed merely because an agent returned JSON.

------------------------------------------------------------------------

# 25. REPAIR STRATEGY

Repair must be evidence-driven.

Input:

``` text
current files
build output
runtime output
browser observation
functional findings
visual findings
original requirements
```

Repair should:

1.  Identify likely cause.
2.  Select affected files.
3.  Make the smallest useful change.
4.  Rebuild.
5.  Re-run affected checks.
6.  Re-run visual inspection if visual behavior changed.
7.  Create a snapshot if successful.

Do not rewrite the whole project unless necessary.

Do not hide failures.

------------------------------------------------------------------------

# 26. APPLICATION QUALITY --- WHAT THE BUILDER MUST GENERATE

A generated application should feel intentionally designed, not like an
LLM dumped a generic landing page.

Minimum quality expectations:

### Information architecture

The structure must reflect the business.

### Visual hierarchy

The page must have a clear focal point and clear primary action.

### Typography

Use intentional type scale, weight, line length, and hierarchy.

### Spacing

Use a coherent rhythm rather than arbitrary gaps.

### Color

Use the merchant brand context intelligently. Do not overuse the accent
color.

### Imagery

Use imagery when it improves the business experience. Do not generate
meaningless decorative boxes.

### Content

Avoid filler such as:

``` text
Discover the future of shopping.
Elevate your lifestyle.
Premium products for everyone.
```

unless justified by the merchant's actual positioning.

### Responsive behavior

Mobile is not an afterthought. The layout strategy should be deliberate.

### Commerce UX

Product discovery, cart, checkout, fulfillment, booking, or service
workflows must feel like parts of the same application.

------------------------------------------------------------------------

# 27. NO FAKE ARTIFACTS

The following patterns are forbidden in production V5:

``` text
fake screenshot path
fake preview URL
fake browser checks
fake console output
fake repair success
fake build success
fake generated file list
hardcoded example products as default output
hardcoded example brand as default output
```

Fixtures may exist in tests, but production execution must use actual
tools/runtime.

------------------------------------------------------------------------

# 28. V4 COMPATIBILITY BOUNDARY

V4 production stores exist.

Do not break them.

However, v4 is NOT the v5 architectural foundation.

Compatibility should happen through contracts:

``` text
V4 store/data
   ↓
canonical commerce/business model
   ↓
V5 workspace
   ↓
V5 agent
   ↓
V5 application
```

Do not force v5 to render old deterministic sections.

Do not require merchants to regenerate their entire business data.

Products, orders, customers, payments, domains, and merchant records
should remain accessible through the commerce layer.

Future V4→V5 migration should be an application evolution operation, not
a data reset.

------------------------------------------------------------------------

# 29. WORKSPACE UI UPGRADE

Keep the current workspace concept and improve it rather than replacing
it unnecessarily.

Current useful areas:

``` text
conversation/agent progress
preview
code
layers
publish
```

Target:

``` text
┌──────────────────────────────────────────────────────────────┐
│ Seltra   Project      Preview | Code | Files | History      │
├───────────────┬───────────────────────────────┬──────────────┤
│ Agent timeline│                               │ Inspector    │
│               │        LIVE PREVIEW           │              │
│ Understand ✓  │                               │ Route        │
│ Plan ✓        │        REAL APP              │ Element      │
│ Design ✓      │                               │ Errors       │
│ Build ●       │                               │              │
│ Verify        │                               │              │
│ Repair        │                               │              │
├───────────────┴───────────────────────────────┴──────────────┤
│ Ask Seltra to change something…                         ↑    │
└──────────────────────────────────────────────────────────────┘
```

The preview must show the real sandbox application.

The Code tab should display actual sandbox files.

The Layers/Inspector surface must inspect the actual rendered
DOM/application where possible, not a fake manifest tree.

------------------------------------------------------------------------

# 30. CHAT EDITING MODEL

A follow-up instruction is an edit operation against the existing
workspace.

Example:

``` text
User:
Make the homepage feel more editorial and reduce the product density.
```

Flow:

``` text
conversation
 ↓
Understand requested delta
 ↓
Inspect workspace
 ↓
Inspect current design direction
 ↓
Plan delta
 ↓
Edit affected files
 ↓
Build
 ↓
Preview
 ↓
Visual critic
 ↓
Repair if necessary
 ↓
Return changed files + result
```

Do not regenerate the whole application unless the user explicitly
requests a rebuild.

------------------------------------------------------------------------

# 31. AGENT COLLABORATION PATTERN

The agents should collaborate through typed artifacts, not by dumping
huge prompt strings into each other.

Example:

``` text
BusinessAnalyst
   ↓ BusinessIntent
Planner
   ↓ ApplicationPlan
Designer
   ↓ DesignDirection
Builder
   ↓ BuildResult
Browser
   ↓ BrowserObservation
FunctionalVerifier
   ↓ FunctionalEvaluation
VisualCritic
   ↓ VisualEvaluation
Repair
   ↓ RepairResult
```

This is the internal equivalent of CrewAI-style task/crew separation
without introducing a Python runtime.

------------------------------------------------------------------------

# 32. PARALLELISM

The Flow engine may run independent tasks concurrently.

Example:

``` text
Planner
  ↓
┌──────────────┬───────────────┬───────────────┐
│ Research     │ Asset plan    │ Commerce map  │
└──────────────┴───────────────┴───────────────┘
                ↓
             Designer
```

Do not parallelize tasks with shared mutable workspace state unless the
Flow explicitly coordinates them.

The Builder should normally have exclusive write access to the
application workspace during a build step.

------------------------------------------------------------------------

# 33. CONCURRENCY / SESSION LOCKING

Use PostgreSQL row locking or equivalent control-plane locking for
AgentRuns/AgentSessions.

The current `AgentSession.lockedBy` and `lockedAt` concept can evolve
into a proper run lock.

Rules:

``` text
one active writer per workspace
multiple read-only observers allowed
one active build mutation at a time
browser observation may run while build is stopped
```

Stale locks must be reclaimable.

------------------------------------------------------------------------

# 34. QUEUE EXECUTION

Continue using pg-boss with PostgreSQL.

Long-running build operations must not block an HTTP request.

Flow:

``` text
POST /tasks
 ↓
create Task + AgentRun
 ↓
enqueue pg-boss job
 ↓
return task/run ID
 ↓
worker executes flow
 ↓
persist events
 ↓
frontend receives/polls/subscribes to progress
```

The worker must execute the actual flow rather than append a fake
sequence of events.

------------------------------------------------------------------------

# 35. API CONTRACTS

Minimum endpoints:

``` text
POST   /workspaces
GET    /workspaces/:id
POST   /workspaces/:id/runs
GET    /workspaces/:id/runs/:runId
GET    /workspaces/:id/events

GET    /workspaces/:id/files
GET    /workspaces/:id/files/*path
POST   /workspaces/:id/files

POST   /workspaces/:id/preview/start
POST   /workspaces/:id/preview/stop
GET    /workspaces/:id/preview

POST   /workspaces/:id/browser/inspect
POST   /workspaces/:id/verify
POST   /workspaces/:id/repair

GET    /workspaces/:id/snapshots
POST   /workspaces/:id/snapshots
POST   /workspaces/:id/restore/:snapshotId

POST   /workspaces/:id/publish
```

Exact REST naming can adapt to the existing controllers, but
capabilities must exist.

------------------------------------------------------------------------

# 36. SECURITY

Secrets provided in local environment belong only in `.env` or
deployment secret management.

Never commit them.

Never render them in browser responses.

Never place them inside generated application files.

Never pass `CLOUDFLARE_API_TOKEN` to the Builder.

Never pass `DATABASE_URL` to the generated application.

Never let a generated app connect directly to Neon production.

Commerce operations must use controlled APIs/tools.

Sandbox IDs are identifiers, not authentication. Application-level
authentication must protect sandbox endpoints. Cloudflare explicitly
notes this in its Sandbox security guidance. citeturn0search2

------------------------------------------------------------------------

# 37. ENVIRONMENT

Local environment expected:

find all env items in the .env file at the root.

Do not commit real values.

------------------------------------------------------------------------

# 38. R2 ARTIFACT STORAGE

Use R2 for large artifacts where appropriate:

``` text
screenshots
video captures if added
large logs
build artifacts
uploaded images
workspace archives
snapshots
```

Database stores references and metadata, not large binary blobs.

Example:

``` text
Artifact
 id
 type
 workspaceId
 storageKey
 mimeType
 size
 metadata
 createdAt
```

------------------------------------------------------------------------

# 39. SNAPSHOT STRATEGY

Cloudflare Sandbox currently documents snapshot/backup capabilities. Use
the SDK's supported snapshot mechanism where appropriate, but keep an
abstraction:

``` ts
interface WorkspaceSnapshotProvider {
  create(workspaceId: string): Promise<SnapshotRef>;
  restore(workspaceId: string, snapshot: SnapshotRef): Promise<void>;
}
```

This prevents infrastructure coupling.

------------------------------------------------------------------------

# 40. IMPLEMENTATION ORDER

## PHASE 1 --- REAL SANDBOX

### Deliverables

-   `SandboxProvider`
-   Cloudflare Sandbox Worker
-   workspace creation
-   sandbox provisioning
-   file operations
-   command execution
-   process management
-   preview server
-   workspace snapshot
-   NestJS sandbox client
-   Builder wired to sandbox

### Definition of done

A merchant prompt causes Seltra to create a real application directory
in an isolated sandbox, install dependencies, build it, run it, and
expose a real preview URL.

The Builder must create actual source files.

The workspace Code view must read those actual files.

No fake file list.

------------------------------------------------------------------------

# 41. PHASE 2 --- AGENT RUNTIME REFACTOR

### Deliverables

``` text
AgentRuntime
AgentRegistry
CrewRegistry
FlowRegistry
ToolRegistry
PolicyRegistry
ModelRegistry
TaskRunner
RunContext
ObservationStore
```

Refactor current agents into separate files:

``` text
packages/agents/src/
  core/
    agent.ts
    task.ts
    crew.ts
    flow.ts
    run.ts
    context.ts
    result.ts
    observation.ts
    artifact.ts

  registry/
    agent.registry.ts
    crew.registry.ts
    flow.registry.ts
    tool.registry.ts

  agents/
    supervisor.agent.ts
    business-analyst.agent.ts
    planner.agent.ts
    researcher.agent.ts
    designer.agent.ts
    commerce.agent.ts
    content.agent.ts
    asset.agent.ts
    builder.agent.ts
    browser.agent.ts
    verifier.agent.ts
    visual-critic.agent.ts
    repair.agent.ts

  crews/
    build.crew.ts
    edit.crew.ts
    repair.crew.ts

  flows/
    build.flow.ts
    edit.flow.ts
    verify.flow.ts
    publish.flow.ts
```

### Definition of done

No orchestration code should instantiate agents directly.

All execution occurs through AgentRuntime + Flow.

All tool calls are observable.

All agent steps have durable state.

------------------------------------------------------------------------

# 42. PHASE 3 --- REAL BROWSER + VERIFICATION

### Deliverables

-   BrowserProvider
-   screenshot capture
-   mobile/desktop viewports
-   route checks
-   console inspection
-   network inspection
-   DOM inspection
-   interaction tests
-   functional verifier
-   runtime health verifier

### Definition of done

The system can deliberately break an application and detect the break
through actual browser/build/runtime observations.

------------------------------------------------------------------------

# 43. PHASE 4 --- DESIGN INTELLIGENCE

### Deliverables

-   BusinessIntent schema
-   ApplicationPlan schema
-   DesignDirection schema
-   improved Designer prompts
-   design memory
-   design decision persistence
-   typography/layout/color/image strategy
-   merchant-specific content strategy

### Definition of done

Golden prompts produce visibly intentional applications with different
visual directions based on merchant intent.

Two merchants with different brands must not receive the same generic
visual structure merely because they share the same vertical.

------------------------------------------------------------------------

# 44. PHASE 5 --- VISUAL CRITIC + REPAIR

### Deliverables

-   real screenshots
-   visual evaluation schema
-   visual critic agent
-   severity classification
-   repair planner
-   repair agent
-   max three repair iterations
-   post-repair verification
-   visual history

### Definition of done

For a visually weak generated app, the system identifies concrete
problems, edits the application, rebuilds, captures new screenshots, and
demonstrates improvement.

------------------------------------------------------------------------

# 45. PHASE 6 --- LOVABLE-CLASS WORKSPACE EXPERIENCE

Improve the workspace UI around the real runtime:

``` text
chat
agent timeline
live preview
code viewer
file tree
history
errors
visual inspection
publish
```

The user should be able to watch the system work without being forced to
understand the internal agent framework.

The interface should communicate:

``` text
what Seltra understood
what it is doing
what changed
what failed
what it fixed
what the user can do next
```

Do not expose internal chain-of-thought. Show concise action/status
summaries and artifacts.

------------------------------------------------------------------------

# 46A. PHASE 7 --- PRODUCTION APP RUNTIME

### Deliverables

``` text
ProductionRuntimeProvider
RuntimeManifest
ApplicationArtifact
Deployment
EnvironmentContract
DomainMapping
HealthCheck
ProductionSmokeTest
RollbackProvider
```

### Definition of done

A verified workspace revision can be transformed into an immutable
production artifact, deployed to an isolated production runtime, health
checked, smoke tested, and promoted without serving the sandbox
directly.

The previous live revision remains available for rollback.

No production deployment may depend on a sandbox process.

------------------------------------------------------------------------

# 46B. PHASE 8 --- PRODUCTION DATA + COMMERCE RUNTIME

### Deliverables

``` text
ApplicationDataGateway
tenant-scoped runtime identity
data contract
migration runner
migration verification
commerce API adapters
payment adapter
webhook verification
file storage adapter
notification adapter
auth/session adapter
```

### Definition of done

A generated application that requires persistent state can
create/read/update its allowed data through controlled production APIs.

A generated application cannot access the control-plane database
directly.

All money-moving and state-changing commerce operations are idempotent,
authenticated, tenant-scoped, auditable, and protected by production
approval rules.

------------------------------------------------------------------------

# 46C. PHASE 9 --- DEPLOYMENT, DOMAIN, OBSERVABILITY + ROLLBACK

### Deliverables

``` text
deployment records
revision promotion
custom domains
TLS/SSL lifecycle
runtime health
request logs
error tracking
deployment metrics
revision rollback
incident state
production activity timeline
```

### Definition of done

A merchant can publish a verified revision, access it through a stable
production URL, map a custom domain, observe health, and roll back to
the previous known-good revision without regenerating code.

------------------------------------------------------------------------

# 46D. PHASE 10 --- CONVERSATIONAL PRODUCTION EVOLUTION

### Deliverables

``` text
production edit intent detection
revision creation
live-to-workspace synchronization
delta planning
selective code editing
data migration planning
preview verification
release candidate creation
merchant approval
atomic promotion
rollback-aware repair
```

### Definition of done

A merchant can make a natural-language change to an existing application
without losing production state.

Example:

``` text
"Change my store theme to a dark luxury style."
"Add a customer account page."
"Add pickup to checkout."
"Change the price of Product X."
"Add a booking flow for consultations."
"Fix the mobile menu."
```

Each request creates a new revision, verifies it, and preserves the
current live revision until the new revision is approved and promoted.

# 46. PHASE 7 --- HARDENING

Hardening applies to the control plane, agent runtime, sandbox,
generated application runtime, deployment system, and production
operations.

Add:

``` text
permissions
budgets
timeouts
rate limits
sandbox cleanup
snapshot cleanup
stale run recovery
provider retries
queue retries
idempotency
structured logging
metrics
trace IDs
security tests
```

------------------------------------------------------------------------

# 47. TEST STRATEGY

Required tests:

### Unit

``` text
agent contracts
flow transitions
tool schemas
model router
budget controller
path validation
workspace ownership
```

### Integration

``` text
NestJS ↔ PostgreSQL
NestJS ↔ pg-boss
NestJS ↔ sandbox worker
sandbox filesystem
sandbox command execution
preview lifecycle
```

### Agent tests

``` text
Planner produces valid ApplicationPlan
Designer produces valid DesignDirection
Builder produces BuildResult
Repair responds to actual failure
```

### Browser tests

``` text
open
navigate
screenshot
console
network
click
type
responsive viewport
```

### Production

``` text
artifact reproducibility
production build
environment validation
data migration
tenant isolation
authentication
authorization
domain mapping
TLS/SSL
health checks
smoke tests
rollback
deployment failure recovery
webhook verification
payment test-mode flows
production log redaction
```

### Release

``` text
revision freeze
artifact hash
preview → production parity
approval gate
atomic promotion
post-deploy verification
rollback to previous revision
```

### End-to-end

At minimum:

``` text
prompt
→ workspace
→ sandbox
→ build
→ preview
→ browser
→ verify
→ visual critique
→ repair
→ verify
→ completed
```

------------------------------------------------------------------------

# 48. TEST FIXTURES VS PRODUCTION EXECUTION

Fixtures are allowed under:

``` text
/evals
/tests/fixtures
```

Production code must never fall back silently to fixture data.

If Cloudflare is unavailable:

``` text
status = provider_unavailable
```

not:

``` text
return fake response
```

This rule applies to AI, browser, sandbox, preview, and verification.

------------------------------------------------------------------------

# 49. DEFINITION OF LOVABLE-CLASS SUCCESS

Seltra V5 is not complete when:

``` text
it generates a page
```

It is complete when:

``` text
merchant describes business
        ↓
Seltra understands business
        ↓
Seltra determines application structure
        ↓
Seltra creates real code
        ↓
Seltra runs real code
        ↓
Seltra observes real application
        ↓
Seltra evaluates function + design
        ↓
Seltra repairs real code
        ↓
Seltra lets merchant iterate conversationally
        ↓
Seltra publishes the application
```

The generated output must be:

``` text
real
editable
multi-page when appropriate
responsive
commerce-aware
visually intentional
functionally tested
repairable
versioned
deployable
observable
secure
tenant-isolated
data-backed when required
rollbackable
publishable
operable
```

A preview is not production.

A build is not a release.

A release candidate is not live.

`LIVE` means the exact immutable revision has been deployed to the
production runtime and passed post-deployment health/smoke verification.

------------------------------------------------------------------------

# 50. CODING RULES FOR CODEX / COPILOT

## Rule 1 --- Inspect before changing

Read the current repository before modifying architecture.

## Rule 2 --- Preserve working v5 capability

The current runtime/workspace/supervisor proof is valuable. Upgrade it;
do not throw it away.

## Rule 3 --- No v4 architectural regression

Do not introduce template selection, deterministic section registries,
or single-page assumptions.

## Rule 4 --- No fake implementation

Do not leave placeholder success responses in production paths.

## Rule 5 --- Type everything

Use TypeScript interfaces/Zod schemas for agent/task/tool/artifact
contracts.

## Rule 6 --- Small changes with tests

After each architectural slice:

``` text
pnpm typecheck
pnpm test
pnpm build
```

Run targeted tests first, then the full suite.

## Rule 7 --- Do not duplicate infrastructure

Use existing NestJS, Prisma, pg-boss, Next.js, and AI abstractions where
they are sound.

## Rule 8 --- Do not expose secrets

Never copy `.env` secrets into generated code or client bundles.

## Rule 9 --- Do not hide errors

Errors become observations/events and route into retry/repair/failure
handling.

## Rule 10 --- Do not stop at scaffolding

Implement the phase fully enough to meet its definition of done before
moving to the next phase.

------------------------------------------------------------------------

# 51. FIRST IMPLEMENTATION TASK FOR CODEX

Start immediately from the existing repository.

Do NOT rewrite the repository from scratch.

Do NOT stop after producing an architecture report.

Perform this sequence:

``` text
1. Inspect current repository.
2. Identify current V5 execution path.
3. Add Workspace domain model.
4. Add SandboxProvider abstraction.
5. Add Cloudflare Sandbox Worker.
6. Add authenticated NestJS → Sandbox Worker client.
7. Provision one sandbox per workspace.
8. Implement file tools.
9. Implement command/process tools.
10. Replace Builder's fake application object with real filesystem generation.
11. Implement real build.
12. Implement real preview process.
13. Connect workspace Code view to real files.
14. Persist execution events.
15. Add snapshots.
16. Test the end-to-end sandbox build.
```

Only after Phase 1 is genuinely passing:

``` text
17. Refactor agents into Agent/Task/Crew/Flow.
18. Move orchestration into FlowEngine.
19. Add ToolRegistry and policies.
20. Add AgentRun/AgentStep/ToolExecution persistence.
21. Replace fake worker event sequence with real execution events.
```

Then:

``` text
22. Implement real BrowserProvider.
23. Implement functional verification.
24. Implement DesignDirection.
25. Implement VisualCritic.
26. Implement Repair loop.
27. Add Build Integrity Engine and deterministic autofixers.
28. Add golden benchmark suite.
29. Implement ProductionRuntimeProvider.
30. Implement immutable artifacts and deployment records.
31. Implement production environment/configuration contract.
32. Implement application data gateway and migrations.
33. Implement domains/TLS and health checks.
34. Implement production smoke tests.
35. Implement atomic promotion and rollback.
36. Implement conversational production revisions.
37. Run the full production benchmark suite.
38. Iterate until all release gates pass.
```

------------------------------------------------------------------------

# 52. REQUIRED FILE / PACKAGE TARGET

The final repository should converge toward something close to:

``` text
apps/
  web/
  nest-api/
  worker/
  sandbox-worker/

packages/
  ai/
  agents/
    core/
    agents/
    crews/
    flows/
    registry/
    tools/
    policies/
  sandbox/
  browser/
  workspace/
  verification/
  design/
  commerce/
  database/
  shared/

evals/
  golden-prompts/
  expected/
  reports/

docs/
  architecture/
```

Do not create every package immediately if it would create unnecessary
fragmentation. The boundaries matter more than the exact package count.

------------------------------------------------------------------------

# 53. MIGRATION FROM CURRENT AGENT FILE

The current monolithic:

``` text
packages/agents/src/index.ts
```

must be decomposed.

During migration, preserve public exports temporarily through
`packages/agents/src/index.ts` so existing imports do not break
unnecessarily.

Example:

``` ts
export { PlannerAgent } from "./agents/planner.agent.js";
export { DesignerAgent } from "./agents/designer.agent.js";
export { BuilderAgent } from "./agents/builder.agent.js";
```

Then migrate consumers.

Do not keep the old fake implementations merely for compatibility after
the real implementations are wired.

------------------------------------------------------------------------

# 53A. BUILDER FREEDOM WITHIN PRODUCTION CONSTRAINTS

The Builder must not be artificially constrained to a fixed number of
routes, files, components, or sections.

The current implementation's prototype limits such as "at most 4
routes", "at most 8 files", or "no extra dependencies" MUST NOT become
the V5 product contract.

Instead use adaptive budgets:

``` text
route budget
file budget
source token budget
dependency budget
build time budget
sandbox CPU/memory budget
model-call budget
```

Budgets are safety/cost controls, not application-shape restrictions.

The Builder may create as many routes/files/components as the approved
ApplicationPlan requires, subject to resource limits.

## Dependency policy

Dependencies must be:

``` text
declared
version-pinned or lockfile-resolved
compatible with the supported runtime profile
installable in the sandbox
present in the final artifact
free of disallowed packages
```

Never silently use `"latest"` for production dependency resolution.

The lockfile is part of the artifact and must be generated from the
exact production dependency graph.

## Package manager policy

One workspace uses one package manager.

The package manager is detected or selected at workspace creation and is
recorded in `RuntimeManifest`.

Do not mix:

``` text
npm + pnpm
npm install + pnpm-lock.yaml
pnpm install + package-lock.json
```

without an explicit migration operation.

## Build integrity layers

The Builder must run:

``` text
Layer 0 — path safety
Layer 1 — filesystem completeness
Layer 2 — import/export graph
Layer 3 — dependency graph
Layer 4 — package manager/lockfile
Layer 5 — framework/config
Layer 6 — syntax/type/lint
Layer 7 — build
Layer 8 — process startup
Layer 9 — HTTP/runtime health
Layer 10 — browser
Layer 11 — functional verification
Layer 12 — visual verification
```

Each layer emits structured findings.

Known deterministic failures are fixed without invoking an LLM where a
safe deterministic repair exists.

# 54. BUILD AGENT BEHAVIOR

The Builder must behave like a coding agent, not a content generator.

Before editing:

``` text
inspect repository
inspect package.json
inspect existing routes
inspect existing styles
inspect current errors
inspect relevant files
```

During editing:

``` text
make focused changes
run formatter/linter if configured
run build/typecheck
inspect failures
repair
```

After editing:

``` text
start preview
return changed files
return build status
return preview reference
```

The Builder must not claim a file exists until the file actually exists.

------------------------------------------------------------------------

# 55. DESIGNER BEHAVIOR

The Designer must not write application code in the first design phase.

It should reason about:

``` text
who the customer is
what the merchant sells
what action matters
what information must be prioritized
what emotional/brand impression matters
how users move through the experience
```

Then produce DesignDirection.

The Builder has creative implementation freedom.

------------------------------------------------------------------------

# 56. VISUAL CRITIC BEHAVIOR

The Visual Critic must compare:

``` text
intent
vs
plan
vs
design direction
vs
rendered output
```

It should answer:

``` text
Did the implementation express the intended design?
Did the application prioritize the right business action?
Does the visual hierarchy match the merchant's positioning?
Does mobile preserve the intended experience?
What concrete code/design changes are necessary?
```

This prevents the critic from merely saying "make it prettier."

------------------------------------------------------------------------

# 57. REPAIR BEHAVIOR

Repair should be selective.

If the visual critic says:

``` text
Hero is visually weak because the image is absent and the headline has too little hierarchy.
```

Repair should inspect:

``` text
hero route
hero component/code
asset usage
typography styles
layout styles
```

Then modify those files.

It should not regenerate the entire application.

------------------------------------------------------------------------

# 58. VISUAL SELF-IMPROVEMENT LOOP

Use a hard maximum:

``` text
initial build
→ visual review
→ repair 1
→ visual review
→ repair 2
→ visual review
→ repair 3
→ final verification
```

If the application still fails the acceptance criteria:

``` text
status = NEEDS_REVIEW
```

Do not claim success.

------------------------------------------------------------------------

# 59. HUMAN APPROVAL

Human approval is required before:

``` text
production publish
production payment configuration changes
irreversible commerce operations
```

Preview generation and sandbox coding may be autonomous.

------------------------------------------------------------------------

# 60. PRODUCTION PUBLISHING

Publishing is a release-engineering operation, not a button that exposes
the preview URL.

The minimum production flow is:

``` text
workspace snapshot
      ↓
revision frozen
      ↓
production build
      ↓
immutable artifact
      ↓
production-like verification
      ↓
release candidate
      ↓
merchant approval
      ↓
deployment
      ↓
production smoke test
      ↓
health check
      ↓
LIVE
```

## 60.1 Production deployment provider

Create:

``` ts
interface ProductionRuntimeProvider {
  build(input: ProductionBuildInput): Promise<ProductionArtifact>;
  deploy(input: DeploymentInput): Promise<Deployment>;
  promote(deploymentId: string): Promise<void>;
  health(deploymentId: string): Promise<HealthResult>;
  rollback(input: RollbackInput): Promise<void>;
  destroy(deploymentId: string): Promise<void>;
}
```

The control plane must not contain provider-specific deployment logic.

## 60.2 Deployment states

``` text
CREATED
BUILDING
BUILT
VERIFYING
READY
APPROVAL_REQUIRED
DEPLOYING
LIVE
DEGRADED
FAILED
ROLLED_BACK
ARCHIVED
```

## 60.3 Production gate

A revision cannot become `LIVE` unless all required gates pass:

``` text
source integrity             PASS
dependency integrity        PASS
type/syntax checks           PASS
production build             PASS
required routes              PASS
runtime startup              PASS
health endpoint              PASS
browser smoke tests          PASS
critical business workflows PASS
security checks              PASS
asset checks                 PASS
data migration checks        PASS
merchant approval            PASS
```

A failed gate produces a specific release failure code.

## 60.4 Domain and SSL

Publishing must support:

``` text
Seltra-provided application URL
merchant custom domain
domain verification
TLS/SSL provisioning
domain-to-application mapping
revision-aware routing
```

Domain mapping must never bypass tenant authorization.

## 60.5 Environment promotion

Maintain distinct environments:

``` text
development
preview
production
```

Do not copy preview secrets into production.

Production configuration is resolved by the control plane from approved
secret/configuration storage.

The generated source code contains references to environment variables,
not their values.

## 60.6 Zero-downtime promotion

Where the runtime supports it:

``` text
current LIVE revision
        │
        ├── remains live
        │
        ▼
new revision deployed
        │
        ▼
smoke test
        │
        ▼
atomic routing switch
```

If promotion fails, traffic remains on the previous revision.

## 60.7 Post-deployment verification

Immediately after promotion:

``` text
GET /
GET /health
critical route checks
critical CTA interaction
critical commerce workflow
asset loading
console error scan
network error scan
```

For applications with payments, booking, orders, or other money/state
operations, use safe test-mode or non-destructive production probes.

Never place a fake order or fake payment in a live merchant system
merely to test deployment.

## 60.8 Deployment record

Persist:

``` text
Deployment
  id
  applicationId
  revisionId
  environment
  artifactId
  status
  domain
  provider
  startedAt
  completedAt
  healthStatus
  verificationId
  previousDeploymentId
  rollbackDeploymentId
```

## 60.9 Publish failure

If production deployment fails:

``` text
status = FAILED
```

not:

``` text
status = LIVE
```

The merchant must see:

``` text
what failed
where it failed
whether the previous version is still live
what Seltra can retry automatically
whether human action is required
```

## 60.10 Rollback

Rollback is an infrastructure operation.

It must never call the Builder unless the merchant explicitly asks for a
new code change.

# 61. SECURITY INSPIRATION

The sandbox design must follow the principle that isolation is more than
putting a process in a container.

Consider:

``` text
filesystem isolation
process isolation
network isolation
identity isolation
secret isolation
resource limits
command policy
auditability
```

Solo's 2026 agent sandbox guidance emphasizes that a useful sandbox must
control the broader attack surface and not simply assume a container
alone solves the problem. citeturn0search0turn0search10

Cloudflare's Sandbox model provides strong VM-level sandbox isolation,
but Seltra must still implement application authentication, command
validation, credential separation, and resource policy.
citeturn0search2

------------------------------------------------------------------------

# 62. WHY THIS ARCHITECTURE IS THE BREAKTHROUGH

V4 primarily answered:

> "Which storefront should Seltra render?"

V5 answers:

> "What application does this business need, and how should Seltra
> build, run, inspect, repair, and evolve it?"

The new architecture therefore has:

``` text
MODEL       = intelligence
AGENT       = role
TASK        = work unit
CREW        = collaboration group
FLOW        = control logic
TOOL        = capability
HARNESS     = execution + policy + context
SANDBOX     = isolated hands
RUNTIME     = actual application
BROWSER     = eyes
VERIFIER    = functional judge
VISUAL      = design judge
REPAIR      = corrective action
WORKSPACE   = persistent project
MEMORY      = durable context
DATABASE    = control/business state
```

That is the system Seltra v5 is building.

------------------------------------------------------------------------

# 63. FINAL ARCHITECTURAL PRINCIPLE

The final Seltra v5 loop is:

``` text
NATURAL LANGUAGE
      ↓
BUSINESS UNDERSTANDING
      ↓
APPLICATION PLAN
      ↓
DESIGN DIRECTION
      ↓
AGENT CREW / FLOW
      ↓
REAL CODE
      ↓
ISOLATED SANDBOX
      ↓
REAL RUNTIME
      ↓
REAL BROWSER
      ↓
OBSERVATION
      ↓
FUNCTIONAL + VISUAL EVALUATION
      ↓
REPAIR
      ↓
RE-RUN
      ↓
MERCHANT ITERATION
      ↓
VERSION / SNAPSHOT
      ↓
PUBLISH
```

The LLM is not the application.

The LLM provides intelligence.

Seltra provides:

``` text
state
memory
tools
workspace
execution
commerce
sandbox
browser
verification
repair
security
versioning
observability
```

Together, those are Seltra v5.

------------------------------------------------------------------------

# 64. FINAL CODEX / COPILOT COMMAND

Read this file completely.

Then inspect the repository at `E-commerce-Runtime-Builder`.

Do not redesign Seltra as a template system.

Do not use v4 as the v5 architectural foundation.

Do not replace the current v5 breakthrough with a simpler deterministic
implementation.

Do not stop at documentation.

Implement the production upgrades in order:

``` text
1. REAL SANDBOX / WORKSPACE EXECUTION
2. BUILD INTEGRITY ENGINE + DETERMINISTIC AUTOFIX
3. AGENT / TASK / CREW / FLOW RUNTIME
4. REAL BROWSER + FUNCTIONAL VERIFICATION
5. DESIGN INTELLIGENCE / VISUAL CRITIC / REPAIR LOOP
6. PRODUCTION APP RUNTIME + IMMUTABLE ARTIFACTS
7. PRODUCTION DATA / COMMERCE / AUTH / INTEGRATIONS
8. DEPLOYMENT / DOMAINS / HEALTH / OBSERVABILITY / ROLLBACK
9. CONVERSATIONAL PRODUCTION EVOLUTION
```

After every phase:

``` text
pnpm typecheck
pnpm test
pnpm build
```

Fix failures before advancing.

When implementation choices are ambiguous, prefer the option that
preserves:

``` text
application freedom
real code generation
real runtime execution
isolated execution
typed agent contracts
observable tool calls
iterative editing
visual verification
V4 data compatibility
production isolation
immutable revisions
rollback capability
tenant isolation
observable deployments
```

The final acceptance test is not:

``` text
the code compiles
```

It is not even:

``` text
the preview works
```

The final acceptance test is:

> A merchant can describe a real commerce business in natural language,
> Seltra can autonomously understand the business, plan an appropriate
> application, write real code into an isolated workspace, run that
> code, inspect the rendered application, identify functional and visual
> defects, repair the code, produce an immutable release candidate,
> deploy that exact verified revision to a production runtime, pass
> production health/smoke checks, publish it behind a stable URL/domain,
> observe its health, roll it back if necessary, and continue editing it
> conversationally without destroying the live revision or production
> data.

## V5 PRODUCTION NON-NEGOTIABLES

``` text
1. Never fake a build.
2. Never fake a browser observation.
3. Never fake a verification result.
4. Never call a sandbox preview production.
5. Never deploy an unverified artifact.
6. Never mutate the live revision in place.
7. Never give generated apps control-plane database credentials.
8. Never expose merchant secrets to generated client code.
9. Never let AI-generated code bypass tenant authorization.
10. Never run destructive production migrations without explicit policy.
11. Never report LIVE until post-deployment verification passes.
12. Always retain a rollback target for a live revision.
13. Every production edit creates a new immutable revision.
14. Every failed release leaves the previous live revision intact.
15. Every claim in the workspace timeline must be backed by a real event.
16. Application freedom is encouraged inside a supported runtime contract.
17. Reliability comes from execution, observation, deterministic checks,
    targeted repair, and release engineering — not from adding agents alone.
```

## V5 PRODUCT STANDARD

Seltra is finished only when it can do all of this:

``` text
PROMPT
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
DESIGN
  ↓
BUILD REAL CODE
  ↓
INTEGRITY CHECK
  ↓
INSTALL
  ↓
COMPILE
  ↓
RUN
  ↓
BROWSER
  ↓
FUNCTIONAL VERIFY
  ↓
VISUAL VERIFY
  ↓
TARGETED REPAIR
  ↓
SNAPSHOT
  ↓
RELEASE CANDIDATE
  ↓
PRODUCTION BUILD
  ↓
PRODUCTION SMOKE TEST
  ↓
MERCHANT APPROVAL
  ↓
DEPLOY
  ↓
HEALTH CHECK
  ↓
LIVE
  ↓
MONITOR
  ↓
MERCHANT SAYS "CHANGE..."
  ↓
NEW REVISION
  ↓
VERIFY
  ↓
PROMOTE OR ROLLBACK
```

That is the V5 production standard.

# 65. PRODUCTION READINESS CHECKLIST

Before Seltra is opened to real merchants, all items below must be
demonstrated in a staging environment and then in a controlled
production release.

## Builder

``` text
[ ] creates real files
[ ] edits existing files
[ ] supports multi-page applications
[ ] supports application-specific workflows
[ ] does not use fixed template selection
[ ] does not impose arbitrary route/file caps
[ ] installs declared dependencies
[ ] generates a coherent lockfile
[ ] passes Build Integrity Engine
[ ] produces truthful BuildResult
```

## Runtime

``` text
[ ] preview runs in isolated sandbox
[ ] preview is never treated as production
[ ] production runtime is separate
[ ] application has health endpoint
[ ] application has runtime identity
[ ] application is tenant-scoped
[ ] application does not receive control-plane secrets
```

## Verification

``` text
[ ] real browser
[ ] desktop verification
[ ] mobile verification
[ ] route verification
[ ] console verification
[ ] network verification
[ ] interaction verification
[ ] accessibility baseline
[ ] functional verification
[ ] visual verification
[ ] production smoke verification
```

## Data and commerce

``` text
[ ] commerce API boundary
[ ] app data boundary
[ ] migration system
[ ] migration safety checks
[ ] authentication
[ ] authorization
[ ] tenant isolation
[ ] payment adapter
[ ] webhook verification
[ ] idempotency
[ ] file storage
[ ] notifications
```

## Deployment

``` text
[ ] immutable artifact
[ ] revision ID
[ ] deployment record
[ ] environment contract
[ ] domain mapping
[ ] TLS/SSL
[ ] atomic promotion
[ ] post-deploy health check
[ ] rollback
[ ] previous live revision retained
```

## Operations

``` text
[ ] request logs
[ ] error logs
[ ] metrics
[ ] deployment events
[ ] health monitoring
[ ] incident state
[ ] cost/usage accounting
[ ] secret redaction
[ ] audit trail
```

## Conversational editing

``` text
[ ] new request understands existing app
[ ] only affected files are changed when appropriate
[ ] production data is preserved
[ ] new revision is created
[ ] preview is verified
[ ] release is approval-gated
[ ] live revision is never mutated in place
[ ] rollback is available
```

## Launch blocker rule

Any missing item above that can compromise:

``` text
security
tenant isolation
money movement
data integrity
production availability
release correctness
```

is a production blocker.

Do not compensate for a missing production control by adding another LLM
agent.

# 66. GOLDEN PRODUCTION BENCHMARK

The golden benchmark is not only a generation benchmark.

Each scenario must prove:

``` text
prompt
→ business understanding
→ application plan
→ generated application
→ preview
→ verification
→ repair where intentionally broken
→ production artifact
→ deployment
→ health
→ smoke test
→ rollback
→ conversational edit
→ second release
```

Minimum scenario families:

``` text
DTC storefront
multi-page brand
restaurant ordering
POS
service booking
tailoring / made-to-order
repair workflow
printing workflow
bookstore
dropshipping
composite commerce application
```

Each scenario must be tested with:

``` text
desktop
mobile
slow network where practical
missing optional asset
runtime failure
build failure
dependency failure
broken route
broken image
invalid form
production deployment failure
rollback
post-publish conversational edit
```

The benchmark passes only when the system produces a truthful final
state.

# 67. FINAL DEFINITION OF SELTRA V5

Seltra V5 is not:

``` text
an LLM that writes a website
```

It is:

``` text
an AI application engineering system
+
a controlled execution harness
+
a commerce runtime
+
a production deployment system
+
a verification system
+
a conversational application evolution system
```

The model provides intelligence.

Seltra provides:

``` text
intent
state
memory
planning
design reasoning
tools
filesystem
execution
sandbox
browser
build integrity
functional verification
visual verification
repair
commerce
data
auth
deployment
domains
observability
versioning
rollback
operations
```

The product promise is therefore:

> **Describe the business. Seltra builds the application, proves that it
> works, publishes it, and keeps it evolvable.**

# END --- SELTRA V5 AUTHORITATIVE IMPLEMENTATION SPECIFICATION

------------------------------------------------------------------------

# APPENDIX A --- RETAINED SELTRA V5 PRODUCT CONTRACT

The following product/application requirements from the prior v5
specification remain authoritative unless they directly conflict with
the new execution/harness rules above. The new harness exists to
implement these requirements, not replace them.

# PART A --- PRODUCT & APPLICATION MODEL

## Purpose

Seltra v5 is not only an AI storefront generator.

It is an **AI-native application builder for commerce and
commerce-enabled businesses**.

The generated output should feel comparable to modern AI application
builders such as Lovable: the merchant describes the business, desired
experience, workflows, branding, and functionality in natural language,
and Seltra generates a working application.

The critical difference is that Seltra understands **commerce,
transactions, products, services, customers, orders, fulfillment,
appointments, inventory, payments, and business operations**.

Therefore:

> **Seltra does not generate websites from templates. Seltra generates
> business applications from intent.**

The application may be a storefront, a multi-page commerce application,
a POS system, a service-booking application, a pre-order application, a
post-order service application, or a combination of these.

------------------------------------------------------------------------

## A.1 Application Types

Seltra v5 must support multiple application types from the beginning.

The application type is determined by the merchant's business intent and
requirements. It must **NOT** be determined by a rigid template
selector.

### A.1.1 Single-Page Stores / Applications

The v4 DTC-style single-page commerce experience remains supported.

Example:

> Build me a minimalist skincare store for a small Ghanaian beauty
> brand.

The generated application may contain:

``` text
product discovery
product presentation
collections
cart
checkout
customer information
brand storytelling
promotional areas
responsive mobile experience
```

The merchant should not need to explicitly define the page architecture.
Seltra determines the appropriate application structure.

### A.1.2 Multi-Page Stores / Applications

Seltra must support real multi-page applications with actual routing.

Example:

> Build a premium fashion store with separate home, shop, collections,
> product, about, journal, contact and checkout experiences.

The generated application may contain:

``` text
/
/shop
/collections
/collections/:slug
/products/:slug
/about
/journal
/journal/:slug
/contact
/cart
/checkout
/account
```

The exact route structure is determined by the business requirements. Do
not impose a fixed route catalog. A merchant may request a completely
different structure.

------------------------------------------------------------------------

## A.2 POS Applications

Seltra v5 must support POS applications for SMEs and legacy businesses.
This includes businesses that operate primarily or partially in physical
locations.

Examples: restaurants, cafés, food vendors, salons, boutiques, retail
shops, pharmacies where legally appropriate, bookstores, stationery
shops, printing businesses, physical service businesses.

Example request:

> Build a POS application for my clothing shop. I need to search
> products, scan or select items, add them to a sale, accept payment,
> print or send receipts, and track today's sales.

Seltra should be capable of generating an application containing
capabilities such as:

``` text
product lookup
inventory lookup
cart / sale creation
customer selection
discounts
taxes
payment
receipt generation
order creation
sales history
inventory updates
daily reporting
staff access
```

The exact interface should be generated based on the merchant's
requirements. A POS application must **NOT** be treated as a predefined
POS template.

------------------------------------------------------------------------

## A.3 Service-Based Applications

Seltra must support businesses that primarily sell services rather than
physical products.

Examples: tailoring, beauty services, consulting, photography, design
services, printing, repairs, cleaning, event services, professional
services, creative services.

Example:

> Build an application for my tailoring business where customers can
> view my services, select a service, provide their measurements, upload
> reference images, choose a date, pay a deposit and track their order.

Seltra must understand that this is not a conventional product catalog.
The generated application may require:

``` text
services
service categories
service options
pricing
availability
booking
customer information
custom requirements
file uploads
measurements
deposits
payments
order status
communication
fulfillment
```

The data model and application structure must be generated around the
business workflow.

------------------------------------------------------------------------

## A.4 Pre-Order Service Applications

Seltra must support businesses where a customer orders or books a
service **before** the service is delivered.

Examples: tailoring, catering, event decoration, photography, custom
printing, furniture production, custom fashion, pre-booked beauty
services, custom cakes, made-to-order products.

Example:

> Build an application for my custom clothing business. Customers should
> choose a design, provide measurements, upload inspiration, select
> fabric, choose a delivery date, pay a deposit and receive updates
> while the outfit is being made.

The system should understand a workflow such as:

``` text
Customer
   ↓
Discover service
   ↓
Configure request
   ↓
Provide requirements
   ↓
Select date
   ↓
Quote / pricing
   ↓
Deposit
   ↓
Order created
   ↓
Production
   ↓
Quality / completion
   ↓
Delivery / collection
```

This is fundamentally different from a conventional instant-purchase
storefront. Seltra must therefore model the **business process**, not
merely the product.

------------------------------------------------------------------------

## A.5 Post-Order Service Applications

Seltra must support businesses where the important customer experience
occurs **after** an order or purchase.

Examples: repairs, tailoring alterations, warranty services,
maintenance, installation, delivery services, custom production,
professional services, after-sales support.

Example:

> Build an application for my electronics repair business where
> customers can submit a repair request, upload photos, receive a quote,
> approve the repair, pay, and track the repair status.

The generated application may require:

``` text
service request
case / ticket
customer information
attachments
diagnosis
quotation
approval
payment
status
assignment
fulfillment
notifications
history
```

The workflow could become:

``` text
Request
   ↓
Assessment
   ↓
Quote
   ↓
Customer approval
   ↓
Payment
   ↓
Service execution
   ↓
Quality check
   ↓
Completion
   ↓
Collection / delivery
```

Again, this must be generated from business intent rather than selected
from a fixed template.

------------------------------------------------------------------------

## A.6 Composite Applications

Seltra must support applications combining multiple application types.

For example:

``` text
Online Store
+ Physical POS
+ Inventory
+ Appointments
+ Customer Accounts
+ Post-order Service
```

A fashion business could request:

> Build an online fashion store where customers can buy ready-made
> clothing, book tailoring appointments, request alterations, and visit
> our physical shop to purchase products.

Seltra should be able to understand this as a single business system
rather than forcing the merchant to choose one application category.

------------------------------------------------------------------------

## A.7 Business Verticals

Seltra v5 must be designed with vertical-aware reasoning from the
beginning.

Initial priority verticals:

``` text
Restaurants / Food & Beverage
Fashion Design Businesses
Clothing / Apparel Brands
Shoe / Footwear Businesses
Tailoring / Seamstress Businesses
Bookstores / Bookshops / Stationery
Design Businesses
Printing Services
Dropshipping
Print-on-Demand
Service Businesses
Custom / Made-to-Order Businesses
Physical Retail
```

Additional verticals should be supported as merchant demand surfaces
through GTM. The architecture must therefore allow new vertical
capabilities to be introduced without redesigning the core platform.

------------------------------------------------------------------------

## A.8 Verticals Are Not Templates

This is a critical architectural rule.

Do **NOT** build:

``` text
Restaurant → RestaurantTemplate
Fashion → FashionTemplate
Tailor → TailorTemplate
Bookstore → BookstoreTemplate
```

Do **NOT** build a deterministic `vertical → template → components`
architecture.

Instead:

``` text
Merchant Intent
       ↓
Business Understanding
       ↓
Vertical Context
       ↓
Workflow Understanding
       ↓
Application Plan
       ↓
Design Reasoning
       ↓
Code Generation
       ↓
Execution
       ↓
Verification
```

The vertical provides **domain knowledge and capabilities**. It does not
dictate the UI.

------------------------------------------------------------------------

## A.9 Business Domain Understanding

The agent system must understand that different businesses have
different fundamental entities.

**Retail:** products, variants, collections, inventory, orders,
customers

**Restaurant:** menu items, categories, modifiers, orders, tables,
customers, kitchen workflow, pickup / delivery

**Tailoring:** services, garments, measurements, fabrics, design
references, appointments, orders, production stages, customers

**Printing:** services, print products, paper/material options,
dimensions, artwork files, quantities, quotes, orders, production,
delivery

**Bookstore:** books, authors, categories, formats, inventory, orders,
customers

**Dropshipping:** products, suppliers, supplier products, customer
orders, fulfillment, shipping, tracking, margins

These are examples of **domain capabilities**, not mandatory schemas for
every generated application.

------------------------------------------------------------------------

## A.10 Business Capability Model

Introduce a capability layer that allows the agents to reason about what
the business needs.

Example capabilities:

``` text
Catalog, Product Management, Service Management, Inventory, Customers,
Orders, Cart, Checkout, Payments, Appointments, Bookings, Quotes,
Deposits, Subscriptions, POS, Tables, Kitchen Workflow, Production,
Fulfillment, Delivery, Shipping, Tracking, File Uploads, Measurements,
Customer Accounts, Notifications, Reviews, Promotions, Discounts,
Analytics, Campaigns, After-Sales Service
```

Capabilities are composable. A business can use any combination of them.

Example --- tailor:

``` text
Service Management + Appointments + Measurements + File Uploads
+ Quotes + Deposits + Orders + Production + Delivery
```

The Orchestrator and specialist agents determine which capabilities are
required.

------------------------------------------------------------------------

## A.11 Business Intent Model

The system should transform a merchant request into a business intent
representation. This is not a UI schema --- it exists so the agents
understand the business.

``` typescript
interface BusinessIntent {
  businessType: string;
  vertical?: string;
  applicationTypes: string[];
  products?: string[];
  services?: string[];
  workflows: BusinessWorkflow[];
  capabilities: BusinessCapability[];
  customers: CustomerModel;
  fulfillment?: FulfillmentModel;
  payment?: PaymentModel;
  locations?: BusinessLocation[];
  requirements: string[];
  constraints: string[];
}
```

------------------------------------------------------------------------

## A.12 Application Types and Capabilities

Application type and business capability must remain separate.

``` text
Application Type → POS
Capabilities → Products, Inventory, Customers, Orders, Payments, Receipts, Reporting
```

``` text
Application Type → Service Application
Capabilities → Services, Appointments, Customer Profiles, Payments, File Uploads, Orders, Notifications
```

``` text
Application Type → Pre-order Application
Capabilities → Configuration, Quotes, Deposits, Orders, Production, Scheduling, Fulfillment
```

This gives Seltra flexibility without creating a template system.

------------------------------------------------------------------------

## A.13 Generated Application Freedom

The generated application may contain:

``` text
pages, routes, layouts, components, forms, dashboards, tables, cards,
modals, wizards, calendars, POS interfaces, product experiences,
service experiences, booking interfaces, customer portals,
order tracking, analytics interfaces
```

The Builder decides how these should be implemented. The application may
contain completely new abstractions when required. The only constraint
is that the generated application must satisfy:

``` text
business intent
functional requirements
commerce requirements
security requirements
accessibility requirements
responsive requirements
verification requirements
```

------------------------------------------------------------------------

## A.14 Lovable-Style Output Principle

The target is not simply:

> "Generate a beautiful storefront."

The target is:

> **"Generate a complete application that feels purpose-built for this
> business."**

### Example

**Merchant request:**

> I run a small tailoring business. Build me an application where
> customers can see my work, choose a tailoring service, upload
> inspiration, provide measurements, book an appointment, pay a deposit
> and track the progress of their outfit.

Seltra should **not** respond by generating:

``` text
Hero
ProductGrid
Testimonials
Newsletter
Footer
```

Instead it should reason:

``` text
Business: Tailoring
Application: Service + Pre-order + Customer Portal
Capabilities: Portfolio, Services, Measurements, File Upload,
              Appointment, Deposit, Order, Production Tracking,
              Notifications
Experience: Discovery → Service Selection → Requirements →
            Measurements → Appointment → Deposit → Order →
            Production Tracking → Completion
```

The Builder then creates the actual application. The resulting UI may
include:

``` text
portfolio gallery
service configurator
measurement form
reference-image uploader
appointment calendar
deposit checkout
order dashboard
production timeline
customer notifications
```

Those interfaces are **generated because the business requires them**,
not because Seltra has a predefined tailoring template.

------------------------------------------------------------------------

## A.15 Multi-Page Routing

Generated applications must support real routing. The Builder may create
routes based on application requirements.

``` text
/
/shop
/products/:slug
/services
/services/:slug
/book
/cart
/checkout
/orders
/orders/:id
/account
/dashboard
```

The route structure is generated from the application plan. Do not
hardcode one universal route structure.

------------------------------------------------------------------------

## A.16 Application Composition

A generated application may contain multiple surfaces.

``` text
Customer Application + Merchant Dashboard + POS
+ Operations Dashboard + Customer Portal
```

Example restaurant:
`Customer Ordering App + Kitchen Display + POS + Manager Dashboard`

Example tailoring business:
`Public Website + Service Booking + Customer Portal + Production Dashboard`

The Orchestrator determines which surfaces are necessary.

------------------------------------------------------------------------

## A.17 Commerce Operating Model

Seltra should understand commerce as a lifecycle:

``` text
DISCOVER → SELECT → CONFIGURE → ORDER / BOOK → PAY → FULFILL
→ TRACK → COMPLETE → SUPPORT → REPEAT
```

Not every business uses every stage.

**Retail:** Discover → Select → Cart → Pay → Fulfill

**Restaurant:** Discover → Select → Customize → Order → Pay → Prepare →
Pickup / Delivery

**Tailoring:** Discover → Select Service → Configure → Measure → Deposit
→ Produce → Fit / Review → Complete → Deliver

**Repair:** Submit → Diagnose → Quote → Approve → Pay → Repair → Verify
→ Return

Seltra should reason about these workflows dynamically.

------------------------------------------------------------------------

## A.18 Vertical Context for Agents

Specialist agents should receive relevant vertical context:

``` text
Planner + Business Intent + Vertical Context + Merchant Memory + Store Context
```

-   The **Designer** uses this to understand the experience.
-   The **Commerce Agent** uses it to understand entities and
    transactions.
-   The **Content Agent** uses it to generate appropriate business
    language.
-   The **Builder** uses it to implement the required application.
-   The **Verifier** uses it to validate domain-specific behavior.

The system should not inject every vertical into every prompt. Context
must remain task-specific.

------------------------------------------------------------------------

## A.19 Vertical Extensibility

New verticals must be introducible without rebuilding the architecture.
The platform should support:

``` text
Vertical Definition
Capability Definition
Workflow Definition
Commerce Rules
Agent Guidance
Verification Rules
```

These should be modular domain knowledge rather than application
templates.

Future examples: Florists, Groceries, Pharmacies, Furniture,
Electronics, Hotels, Gyms, Education, Events, Automotive, Home Services,
Professional Services.

The merchant's natural-language request remains the primary source of
truth.

------------------------------------------------------------------------

## A.20 First Vertical Benchmark

The first generation benchmark must not test only:

> "Can Seltra generate a beautiful ecommerce homepage?"

It should test whether Seltra can generate **different classes of
working business applications**.

Initial benchmark categories:

``` text
1. DTC skincare store
2. Multi-page fashion brand
3. Restaurant ordering application
4. Physical retail POS
5. Tailoring service application
6. Custom clothing pre-order application
7. Repair / post-order service application
8. Bookstore
9. Printing business
10. Dropshipping store
```

Each benchmark should evaluate: business understanding, application
structure, visual quality, functional correctness, commerce correctness,
workflow correctness, responsive behavior, verification success, repair
success.

The benchmark should not reward applications merely for resembling a
predefined template.

------------------------------------------------------------------------

## A.21 Updated Product Definition

Seltra v5 should therefore be defined as:

> **An AI-native commerce application builder and operations platform
> that turns natural-language business intent into complete,
> purpose-built commerce applications.**

The generated application can be: a storefront, a multi-page commerce
app, a POS, a service application, a booking application, a pre-order
application, a post-order service application, an operations dashboard,
a customer portal, or a combination of these.

The merchant should not need to understand application architecture.
They describe the business. Seltra understands the business. Seltra
determines the application requirements. Seltra designs the experience.
Seltra generates the application. Seltra verifies it. Seltra helps
operate it.

------------------------------------------------------------------------

## A.22 Updated Architectural Principle

The fundamental distinction is:

**OLD MODEL:** `Business Type → Template → Components → Props → Store`

**SELTRA V5:**

``` text
MERCHANT INTENT
       ↓
BUSINESS UNDERSTANDING
       ↓
VERTICAL CONTEXT
       ↓
CAPABILITY DISCOVERY
       ↓
WORKFLOW MODEL
       ↓
APPLICATION PLAN
       ↓
DESIGN REASONING
       ↓
CODE GENERATION
       ↓
ASSETS
       ↓
BUILD
       ↓
BROWSER
       ↓
VERIFICATION
       ↓
REPAIR
       ↓
PUBLISH
       ↓
OPERATE
```

This is the architecture that allows Seltra to achieve **Lovable-style
generative freedom while remaining commerce-native**.

------------------------------------------------------------------------

## A.23 Final Product Test

The following should all be valid Seltra requests:

> Build me a premium skincare store. Build me a multi-page fashion brand
> with a journal and customer accounts. Build a POS for my neighborhood
> clothing shop. Build an ordering application for my restaurant. Build
> an application for my tailoring business where customers can book
> appointments and submit measurements. Build a pre-order application
> for my custom clothing business. Build a repair application where
> customers can submit devices, receive quotes and track repairs. Build
> a bookstore with online ordering and physical-store inventory. Build a
> printing business application where customers upload artwork, select
> printing options, receive a quote and pay. Build a dropshipping store
> and connect the customer order workflow to fulfillment.

Seltra should not require the merchant to select `"Store template"`,
`"POS template"`, `"Restaurant template"`, or `"Tailor template"`.

The merchant describes what they want. **The agent system determines
what needs to be built.**

That is the core Lovable-style product experience Seltra v5 should
deliver.

# END OF V5 PRODUCTION SPECIFICATION
