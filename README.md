# Velrix — AI Sales Agent

**Turn every enquiry into a qualified opportunity.**

Velrix is a multi-tenant SaaS AI sales agent. It receives customer enquiries, has natural conversations, qualifies prospects, scores them deterministically, follows up automatically, detects buying intent, and hands hot leads to a human — who can take over while the AI steps aside.

This is a real, working product, not a prototype. The full lifecycle runs end-to-end:

```
ENQUIRY → UNDERSTAND → RESPOND → QUALIFY → SCORE → FOLLOW UP → HANDOFF → CLOSE → LEARN
```

Optimized first for **real estate**, but the architecture is industry-configurable (coaching, education, agencies, interior design, automotive, local services, …).

---

## Stack

- **Next.js 16** (App Router, React 19, Turbopack) — server components + route handlers
- **Prisma 6 + SQLite** in development, **PostgreSQL** in production (same portable schema)
- **TypeScript** throughout, strict mode
- **Zod** request validation
- **bcryptjs** password hashing, cookie sessions (hashed tokens)
- **Vitest** tests
- AI via a pluggable provider: **OpenAI** (chat + embeddings) with a deterministic **local salesperson** fallback that needs no API key

No external services are required to run the full product locally.

---

## Quick start

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npx prisma generate
npx prisma db push            # creates the SQLite database
npm run db:seed               # loads the demo real-estate workspace
npm run dev
```

Open http://localhost:3000

**Demo login:** `owner@velrix.dev` / `velrixdemo123`
**Widget demo:** http://localhost:3000/widget-demo

The demo works with **no AI key** using the deterministic local engine. Add `OPENAI_API_KEY` to `.env` to upgrade to an LLM automatically.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite (unit + end-to-end flow) |
| `npm run db:push` | Sync schema to the database |
| `npm run db:seed` | Seed / reset the demo workspace |
| `npm run db:reset` | Drop + recreate + reseed |

---

## Architecture

Modular `src/lib` engines, thin route handlers, server-component pages.

```
src/lib/
  agent/      engine.ts (turn orchestration), scoring.ts (deterministic),
              state.ts (fact extraction), rag.ts (chunk/embed/retrieve),
              safety.ts (prompt-injection + hallucination guards), simulate.ts
  ai/         provider.ts (interface + retry/timeout), openai.ts, local.ts, index.ts (fallback)
  auth/       password.ts, session.ts (cookies), context.ts (TENANT ISOLATION), rbac.ts
  billing/    plans.ts (entitlements), usage.ts (metering + limits)
  channels/   deliver.ts, whatsapp.ts, instagram.ts (real Graph API adapters)
  analytics.ts, followups.ts, knowledge.ts, notifications.ts, conversations.ts,
  provision.ts, crypto.ts (AES-256-GCM), logger.ts, http.ts, ratelimit.ts, constants.ts

src/app/
  (auth)/     login, signup, forgot, reset
  onboarding/ guided 6-step wizard
  dashboard/  overview, leads, leads/[id], conversations, agent, knowledge,
              automations, channels, analytics, team, billing, settings, notifications
  api/v1/     auth, agent, agent/simulate, leads, conversations, knowledge,
              qualification, automations, integrations, team, billing, organization,
              notifications, onboarding
  api/widget/ start, message, poll, config  (public, CORS, rate-limited)
  api/webhooks/ whatsapp, instagram, razorpay  (signature-verified)
  api/cron/followups  (CRON_SECRET-protected worker)
public/widget.js   self-contained embeddable chat widget
```

### Multi-tenancy & security

- Every entity is scoped to an `organizationId`. `getOrgContext()` verifies membership **server-side** before any org-scoped query — the frontend is never trusted for isolation. Tenant isolation is covered by an automated test.
- RBAC roles: **OWNER / ADMIN / SALESPERSON / VIEWER**, enforced with a permission matrix on every mutating route.
- Customer messages and knowledge content are treated as **untrusted data**. Prompt-injection markers are flagged, customer input is wrapped in an untrusted block, and a hallucination guard blocks invented pricing.
- Integration credentials are encrypted at rest (AES-256-GCM). Sessions store only a SHA-256 hash of the cookie token. Webhooks verify HMAC signatures. Public widget endpoints are rate-limited.

### AI engine

- `runAgentTurn` orchestrates: sanitize → store message → check human-takeover → extract facts → retrieve knowledge (RAG) → **deterministic score** → build a safety-first system prompt → call AI with fallback → guard hallucinations → persist → meter usage → update lead → schedule follow-ups → hot-lead notification → analytics.
- **Lead scoring is deterministic** (not left to the LLM): weighted qualification fields + buying intent + engagement, with configurable thresholds and human-readable reasons.
- Provider abstraction with timeouts, retries, exponential backoff, and automatic fallback to the local engine on failure.

---

## Feature status

### Fully functional (verified end-to-end)
- Sign up / login / logout / email-verification + password-reset flows (dev logs the links when SMTP is unset)
- Multi-tenant organizations, memberships, RBAC
- Guided onboarding wizard
- AI agent engine: conversation, qualification, deterministic scoring, safety
- Knowledge engine: text/FAQ/URL ingest → clean → chunk → embed → retrieve (real RAG; lexical-vector fallback with no AI key)
- Conversations, leads, lead intelligence, timeline
- **Human handoff**: take over → AI stops replying → follow-ups cancel → lead marked handed-off (verified)
- **Follow-up automation** engine + builder, with stop conditions; cron worker route
- **Embeddable website widget** (real: config → start → message → poll, CORS, rate-limited)
- Notifications, analytics (real DB-derived metrics), team management + invites
- Billing **entitlements + usage metering** with plan limits enforced server-side
- Demo seed clearly labeled as demo data

### Requires external credentials (real integration architecture, clearly gated)
- **WhatsApp Business Cloud API** — inbound webhook (signature-verified) + outbound send; connect real credentials in Channels
- **Instagram Messaging** — same Meta pipeline
- **Razorpay billing checkout** — webhook is signature-verified; plan switching runs in explicit **test mode** (no charge) until keys are added. Entitlements/usage are fully real either way.
- **SMTP email** — real send when configured; logs links in dev

None of these are faked. Without credentials they return a clear `requires_credentials` state and the UI marks them "Needs credentials".

---

## Database schema (summary)

`User, Session, EmailVerificationToken, PasswordResetToken, Organization, Membership, Agent, QualificationRule, FollowUpSequence, FollowUpJob, Channel, Integration, KnowledgeSource, KnowledgeChunk, Lead, Conversation, Message, Notification, Subscription, UsageRecord, AuditLog, AnalyticsDaily.`

Foreign keys with cascade deletes, indexed hot paths. Domain enums are stored as `String` (backed by `src/lib/constants.ts` and validated with Zod) so the identical schema runs on SQLite and Postgres.

---

## Environment variables

See `.env.example`. Key ones:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) or a Postgres URL |
| `AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` | secrets (set strong values in prod) |
| `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL` | AI (optional — local fallback otherwise) |
| `SMTP_*` | transactional email (optional) |
| `RAZORPAY_*` | billing (optional) |
| `WHATSAPP_VERIFY_TOKEN`, `INSTAGRAM_VERIFY_TOKEN` | webhook verification |

Never commit secrets. `.env` is gitignored.

---

## Deploying to production (PostgreSQL)

1. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
2. Point `DATABASE_URL` at Postgres (a `docker-compose.yml` for local Postgres is included).
3. `npx prisma migrate deploy` (or `prisma db push`), then `npm run build && npm start`.
4. Set strong `AUTH_SECRET` / `ENCRYPTION_KEY` / `CRON_SECRET`.
5. Schedule the follow-up worker, e.g. every 5 minutes:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/followups`
6. Configure webhooks (WhatsApp/Instagram/Razorpay) to the `/api/webhooks/*` routes and connect credentials in **Channels**.

---

## Tests

`npm test` — Vitest, 29 tests across 6 files:

- Scoring (deterministic, thresholds, clamping, buying intent)
- Fact extraction (name/email/phone/budget/timeline/location, opt-out, merge)
- RBAC permission matrix
- Safety (injection detection, input capping, hallucination guard)
- Billing plans / limits / period keys
- **End-to-end lifecycle** against the DB: enquiry → AI reply → qualification → lead → score → HOT → notification → follow-ups → human takeover → AI stops, **plus a tenant-isolation assertion**

Also verified in a real browser this session: demo login, dashboard/overview, leads, lead detail + human takeover, the embeddable widget performing a live enquiry with knowledge retrieval, and the agent test-simulator.

---

## Known limitations / next improvements

- Rate limiting and follow-up scheduling are in-process (fine for one instance); move to Redis + a durable queue for multi-instance production.
- Knowledge ingest runs synchronously; move large-corpus indexing to a background worker.
- PDF/document parsing accepts pasted text (no binary PDF parser wired yet).
- Streaming AI responses and a visual (drag-and-drop) automation builder are natural next steps.
- Razorpay live checkout UI (Razorpay.js order flow) is the remaining piece of billing; the webhook + entitlements are already real.
