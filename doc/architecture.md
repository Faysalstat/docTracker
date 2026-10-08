# Doctor Tracker: Architecture & Implementation Plan

Requirements: [PRD.md](PRD.md) · Target: **Next.js 16** (App Router), **Express 4**, **MongoDB**

This design follows the official Next.js guidance (links in [References](#12-references)). The rule: wherever Next.js documents a convention, we follow it rather than inventing our own.

---

## 1. System Overview

```
┌──────────┐  HTML / RSC / Server Actions   ┌──────────────────────────────┐   REST + Bearer JWT   ┌──────────────┐     ┌─────────┐
│ Browser  │ ─────────────────────────────> │  Next.js 16 (web)            │ ───────────────────> │ Express 4    │ ──> │ MongoDB │
│          │ <───────────────────────────── │  proxy.ts → optimistic auth  │ <─────────────────── │ (api)        │ <── │         │
└──────────┘   httpOnly session cookie      │  Server Components → reads   │       JSON            │ authn/authz, │     └─────────┘
                                            │  Server Actions   → writes   │                       │ validation,  │
                                            │  data/ (server-only DAL)     │                       │ aggregation  │
                                            └──────────────────────────────┘                       └──────────────┘
```

- **The browser only ever talks to Next.js.** Next.js acts as a _Backend-for-Frontend_. Server Components fetch data and Server Actions perform mutations; both call Express server-to-server. As a result there's no CORS, the session cookie is first-party, the API URL isn't exposed to the browser, and there's no third-party cookie problem.
- **Express is the system of record.** It owns authentication, authorization, validation, business rules and every MongoDB query.
- **Two layers of auth, as the Next.js docs recommend:**
  - Optimistic: `proxy.ts` checks the cookie and redirects.
  - Secure: the server-only data layer verifies the session in Next, and Express verifies the JWT on every request.

---

## 2. Tech Stack

| Layer         | Choice                                                                                                  | Why                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web framework | Next.js 16, App Router, React 19, TypeScript (strict)                                                   | Required. Server Components and Server Actions are the documented default.                             |
| UI            | Tailwind CSS v4 + shadcn/ui (Radix), lucide-react                                                       | Accessible primitives; we own the component code.                                                      |
| Charts        | Recharts (client components)                                                                            | Composable, responsive, SVG-based.                                                                     |
| Validation    | Zod (both apps)                                                                                         | Same validation library on both sides; also used in the Next.js docs examples.                         |
| Session (web) | `jose`, `server-only`                                                                                   | The session library the Next.js auth guide uses; guards against importing server code into the client. |
| API framework | Express 4, TypeScript compiled to CommonJS                                                              | Required; layout and patterns follow `.claude/rules/backend-nodejs.md`.                                |
| ODM           | Mongoose 9                                                                                              | Schemas, indexes, hooks.                                                                               |
| API security  | helmet, bcrypt, jsonwebtoken                                                                            | Express production security best practices.                                                            |
| Logging       | `console.log` / `console.error`                                                                         | Project rule: no logging library.                                                                      |
| Testing       | API: `node:test` scripts against the dev DB. Web: Playwright E2E (Chromium, desktop + mobile viewports) | Integration tests on the real database; real-browser checks of the main flows.                         |
| Tooling       | npm workspaces, ESLint (flat `eslint.config.mjs`), Prettier                                             | One install; Next 16 default lint config.                                                              |
| Local infra   | Docker Compose (`infra/`): MongoDB 8 with a named volume and a least-privilege app user                 | One command to set up; same setup on every machine.                                                    |
| Hosting       | Vercel (web), Render (api), MongoDB Atlas                                                               | Free tiers, simple CI/CD.                                                                              |

---

## 3. Key Technical Decisions

### D1. Next.js as Backend-for-Frontend: data is fetched on the server, never from the browser

- **Choice:** Server Components read from Express, Server Actions write to Express, and the browser never calls Express directly.
- **Why:**
  - The Next.js docs say: _"Server Components cover most data-fetching needs"_. Client-side fetching libraries are meant for browser-only APIs or polled data, and this app needs neither.
  - The session cookie stays first-party, httpOnly and same-site.
  - The JWT never reaches client JavaScript.
  - No CORS setup is needed.
  - Less JavaScript ships to the browser.
- **Trade-off:** search and filter changes cost a server round trip. This is mitigated by streaming with `<Suspense>`, in-page skeletons, dimming the current rows during transitions, and `useTransition` pending states.

### D2. The URL is the state store, so no Redux and no TanStack Query

- **Choice:** search, filters, sort and page live in `searchParams`. The page (a Server Component) validates them with Zod and fetches. Client components only update the URL, using a debounced `router.replace` inside `startTransition`.
- **Why:**
  - Views are shareable and bookmarkable, and back/forward works.
  - There's no client cache to keep in sync.
  - Server Actions plus `revalidatePath`/`refresh()` refresh the data after mutations.
  - A global store would only duplicate server state.
- **Local UI state** (dialogs, drawers) uses plain `useState`. Form state uses `useActionState`.

### D3. Two-layer session security (Next.js auth guide)

- **Login flow:**
  1. The Server Action `login` sends the credentials to `POST /api/auth/login`.
  2. Express verifies the password with bcrypt and returns a signed JWT (HS256, 8h).
  3. Next stores the JWT in an httpOnly cookie using the `cookies()` API, with `secure`, `sameSite=lax`, `path=/` and `expires` set.
- **Optimistic check:** `proxy.ts` verifies the JWT signature and expiry with `jose`, then redirects. It never calls the API or the database.
- **Secure check:** `data/auth.ts` provides `verifySession()`, wrapped in `React.cache`. It runs in every data function and every Server Action. Express independently verifies the Bearer token on every request.
- **Not in layouts:** auth checks don't go in layouts, which don't re-render on navigation (as the docs warn).

### D4. MongoDB indexes follow the ESR rule (Equality → Sort → Range)

- Every list query has a matching compound index.
- Search uses an **anchored prefix match on a normalized `nameLower` field** so it can use the index.
  - A case-insensitive regex (`/i`) can't use an index efficiently.
  - `$text` only matches whole words.
- Each index is verified with `explain()`: it must show IXSCAN, not COLLSCAN.

### As-built notes (Phase 3)

- **Stable pagination:** every sort includes `_id` as a tiebreaker, and `_id` is part of each sort index, so pages never repeat or skip rows and the sort stays index-backed.
- **Doctor list patient counts:** one `$group` over the current page's doctor ids, served by the `{ doctor, admissionDate }` index, not a `$lookup` per row.
- **Sidebar active state:** `usePathname()` suspends while prerendering routes with unknown dynamic params (`/doctors/[id]`), so only the nav links sit in `<Suspense>`, with a fallback that shows the same links without the highlight. The rest of the shell stays prerendered.
- **Request memoization:** `getDoctor` and `getDoctorOptions` are wrapped in React `cache`, so components on the same page share one API call.

### As-built notes (Phase 5)

- **Honest comparisons:** the period-over-period delta is shown only when records cover the whole previous period. Otherwise the tile says "Not enough history to compare" instead of a misleading "+2000%".
- **Incomplete periods:** the bucket still in progress (today, this week, this month) is flagged `partial` by the API and drawn as a dashed "to date" segment with a note, so it doesn't read as a drop.
- **Chart design** follows the dataviz method: a stat-tile row; single-hue area and bar marks in a validated blue (`#2a78d6` light, `#3987e5` dark, passing every validator check); bars ≤ 24px with 4px rounded data-ends; hairline grid; values at bar tips; crosshair and per-bar tooltips; no legend for single series; neutral delta ink with an arrow icon (more admissions is neither good nor bad).
- **Demo data:** `npm run seed:demo` replaces doctors and patients with a deterministic dataset (seeded PRNG: growth trend, winter peak, skewed doctor workloads, condition-appropriate ages); plain `npm run seed` only ensures the admin. Raw batched inserts for speed; it refuses to run in production.

### As-built notes (Phase 4)

- **One patients table:** `components/patients/patients-table.tsx` (client) serves both the patients page (with a doctor column) and the doctor page. Delete uses `useOptimistic`, so the row disappears immediately and React restores it automatically if the action fails.
- **Edit in a dialog, not a sheet:** for consistency with create; the patient dialog has three modes (`create` with a doctor picker, `add-to-doctor`, `edit` with optional reassignment).
- **Selects render their label on the server:** Radix `SelectValue` only knows an item's label after the options mount, so filters pass the selected label as children. Otherwise they render blank until hydration.
- **E2E runs serially:** specs share one real database and one local server (`workers: 1`) and wait for the streamed list before interacting.

---

## 4. Repository Layout

```
doctor-tracker/
├─ package.json              # npm workspaces: ["web", "api"]; scripts: dev, build, lint, test, seed
├─ README.md
├─ doc/                      # PRD.md, architecture.md, source spec
├─ web/                      # Frontend: Next.js app
├─ api/                      # Backend: Express app
└─ infra/                    # Standalone components (not app code)
   ├─ docker-compose.yml     # MongoDB 8, named volume, healthcheck, bound to 127.0.0.1
   ├─ .env.example           # root + app DB credentials
   ├─ README.md              # up / down / reset commands
   └─ mongo/
      ├─ Dockerfile          # mongo:8.0 + init scripts baked in (no host bind mounts)
      └─ init/01-create-app-user.js   # readWrite user on the app DB only
```

`infra/` holds everything that runs on its own next to the apps: Docker Compose, volumes, and DB init scripts. Future standalone services, such as a Mongo admin UI or a reverse proxy, go here too.

### 4.1 `web/`: Next.js

The structure follows the documented _"split project files by feature or route"_ strategy: shared code lives in `src/` top-level folders, and route-specific UI is colocated in **private `_components` folders**. **Route groups** give the login page and the authenticated app different layouts without changing URLs.

```
web/
├─ next.config.ts                 # typedRoutes, images, security headers
├─ eslint.config.mjs
├─ tsconfig.json                  # "strict": true, paths: { "@/*": ["./src/*"] }
├─ components.json                # shadcn config
├─ .env.example
└─ src/
   ├─ proxy.ts                    # optimistic auth redirect (Next 16 replaces middleware.ts)
   ├─ app/
   │  ├─ layout.tsx               # root layout: <html>, fonts (next/font), <Toaster/>, metadata
   │  ├─ globals.css              # Tailwind v4 + design tokens
   │  ├─ page.tsx                 # redirect('/dashboard')
   │  ├─ not-found.tsx
   │  ├─ global-error.tsx
   │  ├─ logout/route.ts         # GET: clears a session the API rejected → /login (excluded from proxy)
   │  ├─ (auth)/
   │  │  ├─ layout.tsx            # centered card layout
   │  │  └─ login/
   │  │     ├─ page.tsx
   │  │     └─ _components/login-form.tsx        # 'use client', useActionState(login)
   │  └─ (dashboard)/
   │     ├─ layout.tsx            # app shell: sidebar + topbar (user menu in <Suspense>)
   │     ├─ _components/          # app-sidebar.tsx, mobile-nav.tsx, topbar.tsx, user-menu.tsx
   │     ├─ dashboard/
   │     │  ├─ page.tsx           # parallel fetches, one <Suspense> per widget
   │     │  ├─ error.tsx
   │     │  └─ _components/       # kpi-cards.tsx, patients-per-doctor-chart.tsx,
   │     │                        # admissions-trend-chart.tsx, condition-donut.tsx, date-range-select.tsx
   │     ├─ doctors/
   │     │  ├─ page.tsx           # reads searchParams → <Suspense key=…><DoctorsTable/></Suspense>
   │     │  ├─ error.tsx
   │     │  ├─ _components/       # doctors-table.tsx, doctor-filters.tsx, doctor-form-dialog.tsx
   │     │  └─ [id]/
   │     │     ├─ page.tsx        # doctor profile + patients of doctor
   │     │     ├─ not-found.tsx
   │     │     └─ _components/    # doctor-profile-card.tsx, doctor-patients-table.tsx, add-patient-dialog.tsx
   │     └─ patients/
   │        ├─ page.tsx
   │        ├─ error.tsx
   │        └─ _components/       # patients-table.tsx, patient-filters.tsx, patient-form-sheet.tsx
   ├─ actions/                    # 'use server' only: thin, delegate to data/
   │  ├─ auth.ts                  # login, logout
   │  ├─ doctors.ts               # createDoctor, updateDoctor, addPatientToDoctor
   │  └─ patients.ts              # createPatient, updatePatient, deletePatient
   ├─ data/                       # Data Access Layer: every file starts with import 'server-only'
   │  ├─ env.ts                   # Zod-validated API_URL / JWT_SECRET (only place reading secrets)
   │  ├─ api-client.ts            # apiFetch(): base URL, Bearer token, timeout, unwraps { isSuccess, message, body }
   │  ├─ session.ts               # decrypt (jose verify), createSession, deleteSession, getSessionToken
   │  ├─ auth.ts                  # verifySession = cache(...), getCurrentUser, signIn
   │  ├─ doctors.ts               # getDoctors(query), getDoctor(id), getDoctorPatients(id, query)
   │  ├─ patients.ts              # getPatients(query)
   │  └─ stats.ts                 # getSummary, getPatientsPerDoctor, getAdmissionsTrend, getConditionBreakdown
   ├─ components/
   │  ├─ ui/                      # shadcn primitives (button, input, dialog, sheet, table, select, …)
   │  ├─ data-table/              # data-table.tsx, pagination.tsx, search-input.tsx,
   │  │                           # select-filter.tsx, date-range-filter.tsx, table-skeleton.tsx
   │  └─ feedback/                # empty-state.tsx, error-state.tsx, confirm-dialog.tsx, submit-button.tsx
   ├─ hooks/                      # use-debounced-callback.ts, use-query-params.ts (URL update helper)
   ├─ lib/
   │  ├─ validations/             # zod: auth.ts, doctor.ts, patient.ts, list-query.ts (searchParams)
   │  ├─ constants.ts             # specializations, conditions, statuses, page sizes
   │  ├─ format.ts                # date / number formatters
   │  └─ utils.ts                 # cn()
   └─ types/                      # DTO types shared across data/ and UI (Doctor, Patient, Paginated<T>, …)
```

**Rules**

- Only `src/data/` reads `process.env` secrets or calls the API. Nothing in `data/` may be imported by a `'use client'` file; `server-only` makes such an import a build error.
- `src/actions/*` re-validate input with Zod, call `verifySession()`, delegate to `data/`, then `revalidatePath()`. They return only `{ ok, errors?, message? }`, never raw records.
- Server Components are the default. `'use client'` appears only on the interactive leaves: forms, filters, pagination controls, charts, dialogs.
- Every data route has `error.tsx`; loading states come from `<Suspense>` boundaries inside the page. Detail routes also have `not-found.tsx`, triggered by `notFound()` when the API reports "X not found".

### 4.2 `api/`: Express

The API follows `.claude/rules/backend-nodejs.md`: a layer-based layout with a strict request flow, **app.ts → global middleware → router → controller → service → (repository) → model**. Source is TypeScript compiled to CommonJS.

```
api/
├─ app.ts                         # dotenv → helmet → body-parser → cors → no-store → GET /api
│                                 # → auth-middleware → routers → 404 / body-error fallback; connect() then listen
├─ nodemon.json · tsconfig.json · eslint.config.mjs · .env.example
├─ scripts/                       # seed.ts, demo-data.ts, migrate-rules-alignment.ts, sync-indexes.ts
├─ test/                          # *.test.ts (node:test + fetch against the dev DB; each run deletes only its records)
├─ backups/                       # mongodump archives (git-ignored)
└─ src/
   ├─ config/      load-env.ts (dotenv) · db.config.ts (MONGO_URI, pool options)
   ├─ connector/   db-connector.ts (connect, close, assertObjectId)
   ├─ model/       user.ts · doctor.ts · patient.ts · enums.ts · init-model.ts
   ├─ router/      <feature>-route.ts       URL → controller only
   ├─ controller/  <feature>-controller.ts  try → service(req) → sendSuccess; catch → sendError
   ├─ service/     <feature>-service.ts     validation (Zod), permission checks, queries; throws Error
   ├─ repository/  patient-repo.ts · stats-repo.ts (shared counts, aggregations)
   ├─ middleware/  auth-middleware.ts · public-routes.ts · fallback-middleware.ts
   ├─ types/       express.d.ts (req.userId, req.userRole, req.isAdmin)
   └─ utils/       http-response.ts · jwt.ts · validate.ts · query.ts
```

---

## 5. Data Model & Indexes

### User

Collection `user`. `email` (unique, lowercase), `password` (bcrypt hash, 10 rounds), `name`, `role: 'admin'`, timestamps. `password` has `select: false` and is loaded only at login. Every collection uses `versionKey: false` and a singular name (`user`, `doctor`, `patient`).

### Doctor

| Field                 | Type   | Rules                                              |
| --------------------- | ------ | -------------------------------------------------- |
| name                  | string | required, 2–100, trimmed                           |
| nameLower             | string | derived by the service on every name write; search |
| specialization        | string | required, from a fixed list                        |
| hospital              | string | required                                           |
| phone                 | string | required, E.164-ish pattern                        |
| email                 | string | required, unique, lowercase                        |
| createdAt / updatedAt | Date   | timestamps                                         |

| Index (ESR)                            | Serves                                                |
| -------------------------------------- | ----------------------------------------------------- |
| `{ email: 1 }` unique                  | uniqueness                                            |
| `{ specialization: 1, createdAt: -1 }` | filter by specialization (+ date range), newest first |
| `{ hospital: 1, createdAt: -1 }`       | filter by hospital (+ date range), newest first       |
| `{ createdAt: -1 }`                    | default list, date range                              |
| `{ nameLower: 1 }`                     | prefix search                                         |

### Patient

| Field            | Type              | Rules                                                       |
| ---------------- | ----------------- | ----------------------------------------------------------- |
| name / nameLower | string            | required / derived                                          |
| age              | number            | 0–120                                                       |
| gender           | enum              | male, female, other                                         |
| phone            | string            | required                                                    |
| email            | string            | optional                                                    |
| condition        | enum              | diabetes, hypertension, asthma, cardiac, respiratory, other |
| status           | enum              | admitted, under_treatment, recovered                        |
| admissionDate    | Date              | required, not in the future                                 |
| doctorId         | ObjectId → doctor | required; populated as `{ _id, name, specialization }`      |
| timestamps       |                   |                                                             |

| Index (ESR)                           | Serves                                          |
| ------------------------------------- | ----------------------------------------------- |
| `{ doctorId: 1, admissionDate: -1 }`  | doctor's patients, patients-per-doctor `$group` |
| `{ condition: 1, admissionDate: -1 }` | condition filter + date sort/range              |
| `{ status: 1, admissionDate: -1 }`    | status filter + date sort/range                 |
| `{ admissionDate: -1 }`               | default list, date range, trend aggregation     |
| `{ nameLower: 1 }`                    | prefix search                                   |

**Query rules**

- `find().sort().skip().limit().lean()` runs in parallel with `countDocuments()` (`Promise.all`), and lists return `{ data, length }`.
- The doctor for a patient list is filled in with `populate('doctorId', 'name specialization')`, applied **after** `limit`, so it only touches one page of records.
- Pagination is offset-based, with `limit` capped at 100. If the data grows past ~100k records, switch to keyset (cursor) pagination on `(admissionDate, _id)`.
- Stats use aggregation pipelines whose first stage is an index-backed `$match`. `$lookup` runs only on the top-N results.

**Index verification** (`explain('executionStats')` on the seeded dataset: 50 doctors, 2,000 patients):

| Query                             | Winning plan                                              | Docs examined / returned |
| --------------------------------- | --------------------------------------------------------- | ------------------------ |
| Doctors: default list             | `IXSCAN(createdAt_-1__id_-1)`                             | 20 / 20                  |
| Doctors: specialization + sort    | `IXSCAN(specialization_1_createdAt_-1__id_-1)`            | 5 / 5                    |
| Doctors: name/email prefix search | `OR(IXSCAN(nameLower_1__id_1), IXSCAN(email_1))`          | 1 / 1                    |
| Patients: default list            | `IXSCAN(admissionDate_-1__id_-1)`                         | 20 / 20                  |
| Patients: condition + sort        | `IXSCAN(condition_1_admissionDate_-1__id_-1)`             | 20 / 20                  |
| Patients: a doctor's patients     | `IXSCAN(doctorId_1_admissionDate_-1__id_-1)`              | 20 / 20                  |
| Stats: admissions over time       | `IXSCAN(admissionDate…)` → `PROJECTION_COVERED` → `GROUP` | **0** (covered) / 29     |

---

## 6. Authentication & Authorization

| Step | Where                        | What                                                                                                                                                                                                                                                                       |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `login-form.tsx`             | Calls `useActionState(login)`. Shows field errors and a pending state.                                                                                                                                                                                                     |
| 2    | `actions/auth.ts`            | Zod-validates input, then `POST /api/auth/login`.                                                                                                                                                                                                                          |
| 3    | `api auth.service`           | bcrypt compare, sign JWT `{ sub, role }` (HS256, 8h). A generic "Invalid credentials" error on failure.                                                                                                                                                                    |
| 4    | `data/session.ts`            | `cookies().set('session', jwt, { httpOnly, secure, sameSite: 'lax', path: '/', expires })`, then `redirect('/dashboard')`.                                                                                                                                                 |
| 5    | `src/proxy.ts`               | On every page request (matcher excludes `_next/static`, `_next/image`, static assets): verify the JWT with jose. A protected route without a valid session goes to `/login`; `/login` with a valid session goes to `/dashboard`.                                           |
| 6    | `data/auth.ts`               | `verifySession = cache(...)` runs in every `data/*` function and every Server Action. If it's invalid, `redirect('/login')`.                                                                                                                                               |
| 7    | `data/api-client.ts`         | Sends `Authorization: Bearer <jwt>`. On a 401 from the API, `redirect('/logout')`: that route handler deletes the cookie and redirects to `/login`. Without it, `proxy.ts` would bounce a still-signed (but rejected) cookie from `/login` back to `/dashboard` in a loop. |
| 8    | `api auth-middleware.ts`     | Mounted globally before every router. Verifies the JWT on every route not in `public-routes.ts` (only `POST /api/auth/login`), and sets `req.userId`, `req.userRole`, `req.isAdmin`.                                                                                       |
| 9    | `actions/auth.ts` → `logout` | `deleteSession()`, then `redirect('/login')`.                                                                                                                                                                                                                              |

The JWT payload holds only `sub` and `role`, with no PII, as the Next.js docs advise. The same `JWT_SECRET` is configured in both apps and never prefixed with `NEXT_PUBLIC_`.

---

## 7. API Design (REST, `/api`)

| Method | Path                                                      | Notes                                                                                                                                                                                                                                                                        |
| ------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api`                                                    | Liveness check (no auth): `{ message: "API is alive" }`.                                                                                                                                                                                                                     |
| POST   | `/api/auth/login`                                         | `{ token, expiresAt, user }`. 401 on any failure, with one generic message.                                                                                                                                                                                                  |
| GET    | `/api/auth/me`                                            | Current user. 401 if the user no longer exists.                                                                                                                                                                                                                              |
| GET    | `/api/doctor/list`                                        | `offset, limit, q, specialization, hospital, from, to, sort`                                                                                                                                                                                                                 |
| POST   | `/api/doctor/create`                                      | "email already exists" on a duplicate.                                                                                                                                                                                                                                       |
| GET    | `/api/doctor/options`                                     | `{ _id, name }` pairs for doctor pickers, sorted via the `nameLower` index (capped at 1000).                                                                                                                                                                                 |
| GET    | `/api/doctor/hospitals`                                   | Distinct hospital names for the filter (`distinct` on the hospital index).                                                                                                                                                                                                   |
| GET    | `/api/doctor/getbyid?id=`                                 | One doctor with `patientCount`; "Doctor not found" if missing.                                                                                                                                                                                                               |
| PUT    | `/api/doctor/update/:id`                                  | Changes only the fields that are sent.                                                                                                                                                                                                                                       |
| GET    | `/api/patient/list`                                       | `offset, limit, q, condition, status, gender, doctorId, from, to, sort`; "Doctor not found" for an unknown `doctorId`.                                                                                                                                                       |
| POST   | `/api/patient/create`                                     | `doctorId` in the body.                                                                                                                                                                                                                                                      |
| GET    | `/api/patient/getbyid?id=`                                |                                                                                                                                                                                                                                                                              |
| PUT    | `/api/patient/update/:id`                                 | Changes only the fields that are sent, including the doctor.                                                                                                                                                                                                                 |
| DELETE | `/api/patient/delete/:id`                                 | Returns `{ _id }`.                                                                                                                                                                                                                                                           |
| GET    | `/api/stats/summary?from&to`                              | totalDoctors, totalPatients, avgPatientsPerDoctor, currentlyAdmitted, admissions in range, previous-period admissions. Parallel index-backed counts (not `$facet`, whose sub-pipelines can't use indexes). The previous period is returned only when records cover it fully. |
| GET    | `/api/stats/patients-per-doctor?from&to&limit=10`         | `$match` admissionDate → `$group` by doctor → `$sort` → `$limit` → `$lookup` (top N only)                                                                                                                                                                                    |
| GET    | `/api/stats/admissions?from&to&interval=day\|week\|month` | `$match` → `$group` by `$dateTrunc` (UTC, weeks start Monday); interval picked from range length when omitted; empty buckets zero-filled; the bucket still in progress is flagged `partial`                                                                                  |
| GET    | `/api/stats/conditions?from&to`                           | `$group` by condition                                                                                                                                                                                                                                                        |

**Conventions**

- Paths are verb-like segments under `/api/<feature>` (`/create`, `/list`, `/getbyid`, `/update/:id`). `sort` takes the form `field` or `-field`, checked against an allowlist. Empty filter params count as "not provided".
- **Every response** is `{ isSuccess, message, body }`, built by `utils/http-response.ts`. Lists put `{ data, length }` in `body` (`length` is the total number of matches).
- **Errors:** services `throw new Error("<readable reason>")`; the controller answers `"<what failed>: <reason>"`, e.g. `"Doctor creation failed: email already exists"`. Mongoose duplicate-key and validation errors are turned into readable messages.
- Status codes: 200 success, 400 validation or business error (including "X not found"), 401 missing/invalid token or failed login, 404 unknown route, 500 only for unexpected middleware errors (generic message; details go to `console.error`).
- Services parse `body` and `query` with Zod, which also strips unknown keys and rejects `{ "$gt": "" }`-style operator values. Every id is checked with `assertObjectId` before a query. The JSON body size limit is `100kb`.
- Records are returned with `.lean()` and their `_id` as is; `nameLower` and `password` are `select: false`, and there is no `__v`.

---

## 8. Frontend Patterns

| Concern                           | Pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **List pages**                    | The page is a Server Component whose header is in the static shell. A child async component awaits `searchParams`, parses them with a lenient Zod schema (invalid values fall back to defaults), fetches, and renders inside `<Suspense fallback={<TableSkeleton/>}>`.                                                                                                                                                                                                                  |
| **Search / filters / pagination** | Client components read `useSearchParams()` and update the URL with `router.replace(pathname + '?' + params, { scroll: false })` inside `startTransition`. Search is debounced by 300 ms, and changing a filter resets `page` to 1. Pagination uses `<Link>`, which gets prefetching.                                                                                                                                                                                                    |
| **Mutations**                     | Dialog forms submit from an event handler (`useFormAction` hook): Zod validates on the client for instant feedback, then the Server Action (inside `startTransition`) re-validates, calls `data/`, maps API errors ("email already exists" → email field error, "not found" → stale-record message) to an `ActionResult`, and calls `refresh()`. Unlike `<form action>`, this keeps the input when there are errors. The login form keeps `useActionState` for progressive enhancement. |
| **Delete**                        | `ConfirmDialog` (alert dialog) stays open and disabled while the Server Action runs, then closes on success; a toast reports the result and `refresh()` updates the list.                                                                                                                                                                                                                                                                                                               |
| **Dashboard**                     | One date-range preset control (URL `range`) scopes every widget. Each widget is an async Server Component in its own `<Suspense>`, streaming independently; on a range change the current widgets dim instead of flashing skeletons. Charts are client components (shadcn chart on Recharts), which only the dashboard route's bundle loads (automatic route code splitting). Each chart has a screen-reader data table.                                                                |
| **Loading / error**               | `<Suspense>` boundaries inside pages give per-section skeletons, so no `loading.tsx` is needed (the static shell already renders instantly). Filter changes run in a transition: the current rows stay visible and dim (`ListContent`) instead of flashing a skeleton. `error.tsx` boundaries use `retry()`; `not-found.tsx` for unknown IDs.                                                                                                                                           |
| **Performance**                   | Server Components by default keep client JS small. `next/font` for fonts. Only the needed columns are fetched. No client-side data cache to sync. Interactive leaves are kept small to limit re-renders.                                                                                                                                                                                                                                                                                |
| **Responsive**                    | Below `md`, the sidebar becomes a `Sheet` drawer and tables become stacked cards. Layouts are mobile-first, and the app is tested at 375px and 1440px.                                                                                                                                                                                                                                                                                                                                  |
| **Accessibility**                 | Radix primitives handle focus and ARIA. Every input has a label. Errors are linked with `aria-describedby`. Contrast meets WCAG AA.                                                                                                                                                                                                                                                                                                                                                     |
| **Caching**                       | `cacheComponents` is **on**, the Next 16 template default. Static UI (the layout chrome) is prerendered into a static shell. Anything reading `cookies()` or `searchParams`, which is all API data, sits inside `<Suspense>` and streams at request time; with Cache Components, reading them outside a boundary is a build error. API data is not cached with `use cache`, because the session token must never become part of a cache key.                                            |

---

## 9. Security Checklist

- **Web:**
  - httpOnly, secure, `sameSite=lax` session cookie.
  - Every Server Action re-checks the session.
  - The `server-only` DAL keeps secrets out of client code.
  - Security headers (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame-ancestors) are set in `next.config.ts`.
  - No `NEXT_PUBLIC_` secrets.
- **API:**
  - helmet (which also removes `X-Powered-By`).
  - bcrypt with cost 10.
  - Zod validation on every input; regex input is escaped; sort fields come from an allowlist (prevents NoSQL injection and ReDoS).
  - A global auth gate with an explicit public-route allowlist; `JWT_SECRET` has no fallback (startup fails without it).
  - Generic 500 messages to clients.
  - `npm audit` in CI.
- **Secrets:** `.env` files are git-ignored, and `.env.example` files are committed.

---

## 10. Environment Variables

**`api/.env.example`**

```
NODE_ENV=development
SERVER_PORT=4000
MONGO_URI=mongodb://doctor_tracker_app:<password>@localhost:27017/doctor-tracker?authSource=doctor-tracker
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=8h
SEED_ADMIN_EMAIL=admin@doctortracker.dev
SEED_ADMIN_PASSWORD=ChangeMe@123
```

**`web/.env.example`**

```
API_URL=http://localhost:4000/api        # server-only, intentionally NOT NEXT_PUBLIC_
JWT_SECRET=same-value-as-api             # used by proxy.ts / data/session.ts to verify the session
```

---

## 11. Implementation Plan

**Phase 1: Foundation** 0. `infra`: Docker Compose MongoDB (named volume, healthcheck, app user).

1. Root npm workspaces, shared Prettier config, `.gitignore`, `.env.example` files.
2. `api`: `config/env.ts`, `db.ts`, `logger.ts`, `app.ts` (helmet, json limit, pino-http), `ApiError`, `error-handler` (problem+json), `not-found`, `/health`, graceful shutdown.
3. `web`: `create-next-app` (TS, Tailwind, ESLint, App Router, `src/`, `@/*` alias), `shadcn init`, root layout, fonts, Toaster, security headers.

**Phase 2: Authentication** 4. `api`: User model, `auth` module (login, me), `authenticate` middleware, admin seed. 5. `web`: `data/session.ts`, `data/auth.ts` (`verifySession`), `data/api-client.ts`, `actions/auth.ts`, `src/proxy.ts`, `(auth)/login`, `(dashboard)/layout.tsx` shell with sidebar, mobile drawer and user menu.

**Phase 3: Doctors** 6. `api`: Doctor model, indexes and `nameLower` hook; list/create/get/update; `/doctors/:id/patients` GET/POST. 7. `web` shared UI: `data-table/*`, `feedback/*`, `use-query-params`, `listQuerySchema`. 8. `web`: `data/doctors.ts`, `actions/doctors.ts`, `/doctors` (table, filters, create/edit dialog), `/doctors/[id]` (profile, patients table, add patient, delete patient).

**Phase 4: Patients** 9. `api`: Patient model and indexes; list (all filters)/create/get/update/delete. 10. `web`: `data/patients.ts`, `actions/patients.ts`, `/patients` (table, filters, edit sheet, delete with optimistic update).

**Phase 5: Dashboard** 11. `api`: `stats` module (summary via parallel index-backed counts, patients-per-doctor, admissions trend, conditions). 12. `web`: `data/stats.ts`, `/dashboard` with KPI cards, a bar chart, an area chart, a donut chart, a date-range select, and per-widget `<Suspense>`.

**Phase 6: Quality & Delivery** 13. Seed script with realistic data (1 admin, ~50 doctors, ~2,000 patients over 12 months). 14. API tests: auth (401/200), validation (400), duplicate email (409), list filters and pagination, stats shape. 15. Check index usage with `explain('executionStats')` on the main queries. 16. UX pass: responsive (375px/1440px), keyboard, empty/error/loading states; Lighthouse audit. 17. Deploy: Atlas → Render (api) → Vercel (web). Set env vars and check `/health`. 18. README: elevator pitch, setup, architecture diagram, technical decisions **D1** and **D2**, desktop and mobile screenshots, demo credentials.

### Verification Checklist

- [ ] `npm run seed`, then `npm run dev` starts both apps, and the seeded admin can log in.
- [ ] Opening `/doctors` without a session redirects to `/login`; `GET /api/doctor/list` without a token returns 401 with `{ isSuccess: false, message: "Authentication required" }`.
- [ ] Search, filters and pagination update the URL; reloading or using back/forward restores the same view.
- [ ] Create, edit and delete reflect immediately (revalidation), and the dashboard numbers update.
- [ ] `explain()` shows IXSCAN for the doctor and patient list queries and the stats `$match`.
- [ ] `npm test` passes; `npm run lint` and `tsc --noEmit` are clean.
- [ ] No layout breakage at 375px; Lighthouse Performance and Accessibility ≥ 90 on the dashboard.

---

## 12. References

- Next.js: [Project structure](https://nextjs.org/docs/app/getting-started/project-structure) · [Authentication](https://nextjs.org/docs/app/guides/authentication) · [Data security](https://nextjs.org/docs/app/guides/data-security) · [Fetching data](https://nextjs.org/docs/app/getting-started/fetching-data) · [Mutating data](https://nextjs.org/docs/app/getting-started/mutating-data) · [proxy.ts](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) · [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- Express: [Security best practices](https://expressjs.com/en/advanced/best-practice-security.html)
- MongoDB: [ESR guideline](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)
- HTTP errors: [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457)
