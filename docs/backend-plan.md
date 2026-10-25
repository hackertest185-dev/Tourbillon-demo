# Backend Readiness & Security Plan

Goal: the whole backend stack — `.NET API`, `ai-service`, `PostgreSQL + pgvector`, `Redis`,
frontend↔backend wiring — running locally, and ready to ship to Railway securely.

Status legend: ✅ already in place · 🔧 fixed in this pass · ⏳ needs a runtime step (commands below)

---

## Phase 0 — Machine prerequisites ⏳

1. **Disk space** — the stack needs ~10–15 GB on `C:`
   (pgvector image ~0.5 GB, redis ~0.1, backend build ~1, ai-service + qwen2.5:7b model ~6.
   Ollama refused to run last time partly because of `ENOSPC`).
   Run `cleanup.ps1` then Settings → System → Storage for more if needed.
2. **Docker Desktop** installed, running, WSL2 backend enabled. Verify: `docker --version`.
3. **`.env` complete** (see the checklist in Phase 1; `.env.example` documents every key).

## Phase 1 — Local stack green ⏳

| Step | Command | Pass condition |
|---|---|---|
| Start stack | `make up` (auto picks GPU/CPU) | all 4 containers healthy |
| Health | `curl http://localhost:5248/health/ready` | `postgres: Healthy, redis: Healthy` |
| Catalogue | `curl http://localhost:5248/api/brand` | 200, brands array |
| First request compiles BM25F | second call | p50 < 100 ms |
| Frontend wiring | frontend `.env`: `NEXT_PUBLIC_API_URL=http://localhost:5248/api` | `/tourbillon` loads watches, no console "Failed to fetch" |
| Admin bootstrap | set `ADMIN_EMAIL` in `.env`; sign in with that account once | gets Admin role automatically on boot |

DB migrations apply automatically at boot (`context.Database.Migrate()` in `Program.cs`), and the
database is created if missing (dev only). No manual `dotnet ef` step needed.

If the AI model is not wanted locally, `LLM_BASE_URL` can point at Anthropic instead of Ollama —
but the default local path needs the ~6 GB model and a healthy GPU.

## Phase 2 — Security hardening

### Already solid ✅ (checked in this pass)

- ASP.NET Identity, **HttpOnly + SameSite=Strict** session cookie, 401-on-redirect instead of login-page hops
- CORS allowlist (`ALLOWED_ORIGINS` + exact-match; wildcard is NOT used; `*.vercel.app` allowed for previews)
- Hangfire dashboard protected by an admin-only auth filter
- Swagger only in Development
- Password policy + password change rate limiting + AI/chat daily quotas (`AiUsageQuotaService`)
- Request sanitization middleware for password-bearing endpoints
- EF Core everywhere — no raw SQL interpolation of user input (identifiers are quoted, values parameterised)
- Secrets via env vars / user-secrets, never committed (`appsettings` ships empty strings)

### Fixed in this pass 🔧

1. **Session cookie `SecurePolicy = Always`** (`Program.cs`) — cookie can never ride plain HTTP.
2. **ForwardedHeaders + HSTS in production** (`Program.cs`) — behind Railway/Cloudflare the real
   client IP and scheme arrive as `X-Forwarded-*`; processing them first makes IP rate limits and
   HTTPS redirection see the real client. HSTS pins browsers to HTTPS.
3. **Per-IP rate limiter (20 req/min)** on `api/Authentication`, `api/Account`, `api/Profile`
   (`Program.cs`) — brute-force/stuffing resistance on identity endpoints.
4. **docker-compose env completeness** — `AppSettings__FrontendBaseUrl` and
   `AdminSettings__SeedAdminEmail` are now passed through (`FRONTEND_BASE_URL`, `ADMIN_EMAIL`).

### Remaining, ordered by value ⏳

1. `dotnet list package --vulnerable --include-transitive` in `backend/` — patch flagged packages.
2. Local **Redis has no password** — fine inside the compose network (ports are NOT exposed to
   LAN by default... note: compose does publish 6379/5432; keep them bound to 127.0.0.1 when
   exposing: `- "127.0.0.1:5432:5432"` — change when you share the machine's network).
3. Production provider secrets real values: `SMTP`, `Google OAuth`, `Cloudinary/S3`, `Upstash`
   (Redis connection string must keep `ssl=true` on Upstash; local `redis:6379` stays plain).
4. Upload endpoints: confirm admin-only authorization + content-type/extension checks
   (CloudinaryService callers) once the stack runs — review, not rewrite.
5. Log file hygiene: Serilog writes `logs/tourbillon-*.log` — verify no PII beyond IP/UA in
   requests; the sanitization middleware already covers password fields.

## Phase 3 — Verification ⏳ (runbook)

```bash
make up                                  # stack
curl -f http://localhost:5248/health/ready
cd backend.Tests && dotnet test          # unit tests (GitHub Actions runs this on push)
node eval/run-eval.mjs --scope=spec --arms=bm25,smart   # search benchmark, no model calls
```

Browser flow checks (sign up → session cookie → favourites → sign out → 401; second account
cannot read the first's favourites — per-user scoping is by `user.sub` server-side).

## Phase 4 — Production ship checklist

Railway service env vars: everything in `.env.production.example` — `CONNECTION_STRING` (Neon with
`sslmode=require`), `Upstash` Redis (`ssl=true,abortConnect=false`), `ALLOWED_ORIGINS` = the real
domain(s), `FRONTEND_BASE_URL` = prod domain, Google OAuth client, SMTP relay creds, S3 keys,
`Storage:Provider=S3`, `LLM_BASE_URL=https://api.anthropic.com/v1` etc. Dev-only relaxations set by
compose (`DisableLimitInDev`, `AllowEvalOverrides`, `ExposeCandidates`) must be absent/false in
Railway — defaults in `appsettings.json` are already the safe values.

The frontend on Vercel uses the `/api/backend/*` catch-all proxy with `NEXT_PUBLIC_API_URL=/api/backend`,
or the direct URL — one of them, configured explicitly.
