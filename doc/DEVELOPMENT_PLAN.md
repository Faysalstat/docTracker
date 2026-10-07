# Doctor Tracker: Development Plan & Progress

Related: [PRD.md](PRD.md) · [architecture.md](architecture.md)

**Status legend:** ✅ Done · 🟡 In progress · ⬜ Not started · ⛔ Blocked

**How to update:** change a task's status when you start or finish it, update the phase summary table, and add a line to the [Change Log](#change-log).

---

## Overall Progress

| Phase     | Scope                    | Tasks  | Done   | Status  |
| --------- | ------------------------ | ------ | ------ | ------- |
| 0         | Planning & documentation | 3      | 3      | ✅      |
| 1         | Foundation               | 9      | 9      | ✅      |
| 2         | Authentication           | 9      | 9      | ✅      |
| 3         | Doctors                  | 10     | 10     | ✅      |
| 4         | Patients                 | 7      | 7      | ✅      |
| 5         | Dashboard                | 8      | 0      | ⬜      |
| 6         | Quality & delivery       | 10     | 0      | 🟡      |
| **Total** |                          | **56** | **38** | **68%** |

---

## Phase 0: Planning & Documentation ✅

| ID   | Task                                                                 | Status |
| ---- | -------------------------------------------------------------------- | ------ |
| P0-1 | Analyse the source spec and resolve its ambiguities                  | ✅     |
| P0-2 | PRD ([PRD.md](PRD.md))                                               | ✅     |
| P0-3 | Architecture & folder structure ([architecture.md](architecture.md)) | ✅     |

---

## Phase 1: Foundation ✅

**Goal:** both apps run locally with lint, typecheck and a health check.

| ID  | Task                                                                                                                                  | App   | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| F-0 | `infra/`: Docker Compose MongoDB 8 (named volume, healthcheck, localhost-only port, least-privilege app user)                         | infra | ✅     |
| F-1 | Root `package.json` with npm workspaces (`web`, `api`), root scripts (`dev`, `build`, `lint`, `test`, `seed`), Prettier, `.gitignore` | root  | ✅     |
| F-2 | Scaffold `api`: TypeScript (strict), ESLint, Vitest, `.env.example`                                                                   | api   | ✅     |
| F-3 | `config/env.ts` (Zod), `config/db.ts`, `config/logger.ts` (pino)                                                                      | api   | ✅     |
| F-4 | `app.ts` (helmet, JSON limit, pino-http), `routes.ts` with `GET /health`, graceful shutdown in `server.ts`                            | api   | ✅     |
| F-5 | `ApiError`, `error-handler` (problem+json), `not-found`                                                                               | api   | ✅     |
| F-6 | Scaffold `web` with `create-next-app` (TS, Tailwind, ESLint, App Router, `src/`, `@/*`) and `.env.example`                            | web   | ✅     |
| F-7 | `shadcn init` and base components; root layout, `next/font`, Toaster, `globals.css` tokens                                            | web   | ✅     |
| F-8 | Security headers in `next.config.ts`; `not-found.tsx`, `global-error.tsx`                                                             | web   | ✅     |

**Done when:** `docker compose -f infra/docker-compose.yml up -d` reports healthy, `npm run dev` starts both apps, `GET /health` returns 200, and `npm run lint` plus `tsc --noEmit` are clean.

---

## Phase 2: Authentication ✅

**Goal:** only a signed-in admin can reach any page or API.

| ID  | Task                                                                                            | App | Status |
| --- | ----------------------------------------------------------------------------------------------- | --- | ------ |
| A-1 | `User` model (`passwordHash` select: false)                                                     | api | ✅     |
| A-2 | `auth` module: `POST /auth/login` (bcrypt, JWT via jose, 8h), `GET /auth/me`                    | api | ✅     |
| A-3 | `authenticate` middleware (Bearer JWT), applied to all `/api/v1/*` routes except login          | api | ✅     |
| A-4 | Seed admin user (`scripts/seed.ts`, admin part)                                                 | api | ✅     |
| A-5 | `data/session.ts` (create/decrypt/delete cookie), `data/auth.ts` (`verifySession` with `cache`) | web | ✅     |
| A-6 | `data/api-client.ts` (base URL, Bearer token, timeout, error mapping, 401 → `/login`)           | web | ✅     |
| A-7 | `actions/auth.ts` (`login`, `logout`), `(auth)/login` page and `login-form` (`useActionState`)  | web | ✅     |
| A-8 | `src/proxy.ts`: optimistic redirect for protected and public routes                             | web | ✅     |
| A-9 | `(dashboard)/layout.tsx` app shell: sidebar, mobile drawer, topbar, user menu, logout           | web | ✅     |

**Done when:** opening `/doctors` while signed out redirects to `/login`; the API returns 401 without a token; login and logout work.

---

## Phase 3: Doctors ✅

**Goal:** create, list, search, filter, paginate and view doctors with their patients.

| ID   | Task                                                                                                                          | App | Status |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | --- | ------ |
| D-1  | `Doctor` model, `nameLower` hook, ESR indexes                                                                                 | api | ✅     |
| D-2  | `GET /doctors` (q, specialization, hospital, from/to, sort, page/limit) and `POST /doctors` (409 on duplicate email)          | api | ✅     |
| D-3  | `GET /doctors/:id`, `PATCH /doctors/:id`                                                                                      | api | ✅     |
| D-4  | `GET /doctors/:id/patients`, `POST /doctors/:id/patients` (needs P-1)                                                         | api | ✅     |
| D-5  | Shared UI: `data-table/*` (table, pagination, search, select filter, date-range filter, skeleton)                             | web | ✅     |
| D-6  | Shared UI: `feedback/*` (empty state, error state, confirm dialog, submit button); `use-query-params` hook; `listQuerySchema` | web | ✅     |
| D-7  | `data/doctors.ts`, `actions/doctors.ts`                                                                                       | web | ✅     |
| D-8  | `/doctors` page: table, filters, URL state, `<Suspense key>`, `loading.tsx`, `error.tsx`                                      | web | ✅     |
| D-9  | Create/edit doctor dialog (`useActionState`, field errors, toast)                                                             | web | ✅     |
| D-10 | `/doctors/[id]`: profile card, patients table, add-patient dialog, delete patient (confirm), `not-found.tsx`                  | web | ✅     |

**Done when:** all PRD DOC-1…DOC-9 acceptance criteria pass, and the URL restores the view on reload.

---

## Phase 4: Patients ✅

**Goal:** a dedicated patients page with full management.

| ID  | Task                                                                                                  | App | Status |
| --- | ----------------------------------------------------------------------------------------------------- | --- | ------ |
| P-1 | `Patient` model, `nameLower` hook, ESR indexes                                                        | api | ✅     |
| P-2 | `GET /patients` (q, condition, status, gender, doctorId, from/to, sort, page/limit), `POST /patients` | api | ✅     |
| P-3 | `GET/PATCH/DELETE /patients/:id`                                                                      | api | ✅     |
| P-4 | `data/patients.ts`, `actions/patients.ts`                                                             | web | ✅     |
| P-5 | `/patients` page: table, filters, URL state, loading/error                                            | web | ✅     |
| P-6 | Create/edit patient dialog (doctor select, validation)                                                | web | ✅     |
| P-7 | Delete patient with confirm dialog and `useOptimistic`                                                | web | ✅     |

**Done when:** all PRD PAT-1…PAT-7 acceptance criteria pass.

---

## Phase 5: Dashboard ⬜

**Goal:** server-aggregated analytics with charts.

| ID  | Task                                                                                            | App | Status |
| --- | ----------------------------------------------------------------------------------------------- | --- | ------ |
| S-1 | `GET /stats/summary` (one `$facet`)                                                             | api | ⬜     |
| S-2 | `GET /stats/patients-per-doctor` (`$group` → `$sort` → `$limit` → `$lookup`)                    | api | ⬜     |
| S-3 | `GET /stats/admissions` (`$dateTrunc` by day/month)                                             | api | ⬜     |
| S-4 | `GET /stats/conditions`                                                                         | api | ⬜     |
| S-5 | `data/stats.ts`                                                                                 | web | ⬜     |
| S-6 | KPI cards and date-range select (URL state)                                                     | web | ⬜     |
| S-7 | Charts: patients-per-doctor bar, admissions area, condition donut (Recharts, client components) | web | ⬜     |
| S-8 | `/dashboard` page: one `<Suspense>` per widget, `loading.tsx`, `error.tsx`                      | web | ⬜     |

**Done when:** all PRD DASH-1…DASH-6 pass, and the numbers update after a create or delete.

---

## Phase 6: Quality & Delivery 🟡

**Goal:** tested, verified, deployed and documented.

| ID   | Task                                                                                                                                                                                                                     | App  | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------ |
| Q-1  | Full seed: ~50 doctors and ~2,000 patients over 12 months                                                                                                                                                                | api  | ⬜     |
| Q-2  | API tests: auth (401/200), validation (400), duplicate (409), list filters and pagination, stats                                                                                                                         | api  | ⬜     |
| Q-3  | `explain('executionStats')` on the list and stats queries shows IXSCAN                                                                                                                                                   | api  | ⬜     |
| Q-4  | Responsive pass (375px / 768px / 1440px), mobile cards and drawer                                                                                                                                                        | web  | ⬜     |
| Q-5  | Accessibility pass (keyboard, labels, contrast) and Lighthouse ≥ 90                                                                                                                                                      | web  | ⬜     |
| Q-6  | Deploy: MongoDB Atlas → Render (api) → Vercel (web); env vars set                                                                                                                                                        | both | ⬜     |
| Q-7  | README: pitch, setup, architecture, decisions D1 and D2, demo credentials                                                                                                                                                | root | ⬜     |
| Q-8  | Screenshots for desktop and mobile, added to the README                                                                                                                                                                  | root | ⬜     |
| Q-9  | Final check against the PRD coverage table (§9) and submission                                                                                                                                                           | root | ⬜     |
| Q-10 | Playwright E2E: auth, doctors (create, search + URL state, duplicate email, add and delete patient, not-found), patients (create with doctor, filter by doctor/condition, edit, delete, validation); extend to dashboard | web  | 🟡     |

---

## Risks & Blockers

| #   | Item                                                                 | Impact           | Mitigation                                                            | Status |
| --- | -------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- | ------ |
| R-1 | The Render free tier sleeps, so the first request after idle is slow | Demo latency     | Warm up `/health` before the demo, or upgrade the plan                | Open   |
| R-2 | Login has no rate limit (removed for now)                            | Brute-force risk | Revisit before production: limit by IP + email, forward the client IP | Open   |

---

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-07 | Plan created. Phase 0 (PRD, architecture) complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-10-07 | Phase 4 complete. API: `GET /doctors/options` (34 API tests). Web: patients page (search, condition/status/gender/doctor/date filters, sort, pagination), create with a doctor picker, edit (incl. reassigning the doctor), optimistic delete; one shared `PatientsTable` for the patients and doctor pages. Fixed selects rendering blank before hydration (label passed to `SelectValue`). E2E: 9 tests, now serial with readiness waits after load-related flakiness.                                                                                                                                                                                                                                                                                 |
| 2026-10-07 | Phase 3 complete, plus the patients API (P-1 to P-3) brought forward because the doctor screens depend on it. API: Doctor/Patient models with ESR indexes (`_id` tiebreaker), search/filter/sort/pagination, hospitals endpoint, nested doctor patients; 33 API tests. Web: doctors list (URL state, transitions, desktop table and mobile cards), doctor detail (profile, patients, add/delete patient), shared data-table, form and feedback components, `PatientFormDialog` (edit mode ready for P-6). Added a Playwright E2E suite (7 tests, Q-10). Fixes: the sidebar `usePathname` now sits behind `<Suspense>` (dynamic-route prerender), and mobile filter layout, the sort default and the header divider were polished from screenshot review. |
| 2026-10-07 | Phase 2 complete. API: User model, `POST /auth/login` (bcrypt cost 12, constant-time path for unknown emails), `GET /auth/me`, `authenticate` middleware, idempotent admin seed; 12/12 API tests (in-memory MongoDB). Web: `data/` DAL (env, session, api-client, auth), login Server Action with `useActionState`, `src/proxy.ts`, `/logout` route handler, sidebar app shell with a streamed user menu. Verified end to end: redirects, forged cookie, login errors, cookie flags (`Secure; HttpOnly; SameSite=lax`). shadcn's `use-mobile` hook rewritten with `useSyncExternalStore` (React lint rule).                                                                                                                                              |
| 2026-10-07 | Phase 1 complete. Next.js 16.4 (Cache Components + Partial Prefetching on, the template defaults; typed routes), shadcn/ui (Radix, nova), Express 5 + Mongoose 9 + Zod 4 + pino. API tests 4/4 pass; lint, typecheck and `next build` are clean. Decisions: Zod parsing in controllers (Express 5 `req.query` is read-only) instead of a `validate` middleware; TypeScript stays on 5.9 (typescript-eslint doesn't support TS 7); `shell-quote` overridden to a patched version.                                                                                                                                                                                                                                                                         |
| 2026-10-07 | F-0 done: `infra/` with MongoDB 8 in Docker. The init script is baked into a small image because Docker Desktop can't bind-mount from the G: drive. Repo layout is now `web/` · `api/` · `infra/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
