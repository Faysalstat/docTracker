# Doctor Tracker: Architecture & Implementation Plan

Requirements: [PRD.md](PRD.md) · Target: **Next.js 16** (App Router), **Express 5**, **MongoDB**

This design follows the official Next.js guidance (links in [References](#12-references)). The rule: wherever Next.js documents a convention, we follow it rather than inventing our own.

---

## 1. System Overview

```
┌──────────┐  HTML / RSC / Server Actions   ┌──────────────────────────────┐   REST + Bearer JWT   ┌──────────────┐     ┌─────────┐
│ Browser  │ ─────────────────────────────> │  Next.js 16 (web)            │ ───────────────────> │ Express 5    │ ──> │ MongoDB │
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

| Layer         | Choice                                                                                  | Why                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web framework | Next.js 16, App Router, React 19, TypeScript (strict)                                   | Required. Server Components and Server Actions are the documented default.                             |
| UI            | Tailwind CSS v4 + shadcn/ui (Radix), lucide-react                                       | Accessible primitives; we own the component code.                                                      |
| Charts        | Recharts (client components)                                                            | Composable, responsive, SVG-based.                                                                     |
| Validation    | Zod (both apps)                                                                         | Same validation library on both sides; also used in the Next.js docs examples.                         |
| Session (web) | `jose`, `server-only`                                                                   | The session library the Next.js auth guide uses; guards against importing server code into the client. |
| API framework | Express 5, TypeScript                                                                   | Required. v5 forwards rejected promises to error middleware.                                           |
| ODM           | Mongoose 9                                                                              | Schemas, indexes, hooks.                                                                               |
| API security  | helmet, bcrypt, jose                                                                    | Express production security best practices.                                                            |
| Logging       | pino + pino-http                                                                        | Structured, low-overhead logs.                                                                         |
| Testing       | Vitest, supertest, mongodb-memory-server                                                | Fast API integration tests.                                                                            |
| Tooling       | npm workspaces, ESLint (flat `eslint.config.mjs`), Prettier                             | One install; Next 16 default lint config.                                                              |
| Local infra   | Docker Compose (`infra/`): MongoDB 8 with a named volume and a least-privilege app user | One command to set up; same setup on every machine.                                                    |
| Hosting       | Vercel (web), Render (api), MongoDB Atlas                                               | Free tiers, simple CI/CD.                                                                              |

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
- **Trade-off:** search and filter changes cost a server round trip. This is mitigated by streaming with `<Suspense>`, `loading.tsx` skeletons, and `useTransition` pending states.

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
  1. The Server Action `login` sends the credentials to `POST /api/v1/auth/login`.
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
   │     │  ├─ loading.tsx
   │     │  ├─ error.tsx
   │     │  └─ _components/       # kpi-cards.tsx, patients-per-doctor-chart.tsx,
   │     │                        # admissions-trend-chart.tsx, condition-donut.tsx, date-range-select.tsx
   │     ├─ doctors/
   │     │  ├─ page.tsx           # reads searchParams → <Suspense key=…><DoctorsTable/></Suspense>
   │     │  ├─ loading.tsx
   │     │  ├─ error.tsx
   │     │  ├─ _components/       # doctors-table.tsx, doctor-filters.tsx, doctor-form-dialog.tsx
   │     │  └─ [id]/
   │     │     ├─ page.tsx        # doctor profile + patients of doctor
   │     │     ├─ loading.tsx
   │     │     ├─ not-found.tsx
   │     │     └─ _components/    # doctor-profile-card.tsx, doctor-patients-table.tsx, add-patient-dialog.tsx
   │     └─ patients/
   │        ├─ page.tsx
   │        ├─ loading.tsx
   │        ├─ error.tsx
   │        └─ _components/       # patients-table.tsx, patient-filters.tsx, patient-form-sheet.tsx
   ├─ actions/                    # 'use server' only: thin, delegate to data/
   │  ├─ auth.ts                  # login, logout
   │  ├─ doctors.ts               # createDoctor, updateDoctor, addPatientToDoctor
   │  └─ patients.ts              # createPatient, updatePatient, deletePatient
   ├─ data/                       # Data Access Layer: every file starts with import 'server-only'
   │  ├─ env.ts                   # Zod-validated API_URL / JWT_SECRET (only place reading secrets)
   │  ├─ api-client.ts            # apiFetch(): base URL, Bearer token, timeout, problem+json → ApiRequestError
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
- Every route segment has `loading.tsx` and `error.tsx`. Detail routes also have `not-found.tsx`, triggered by `notFound()` on a 404 from the API.

### 4.2 `api/`: Express

The API uses a feature-module layout with a fixed layer order: **routes → controller (HTTP only) → service (business logic and queries) → model**.

```
api/
├─ tsconfig.json
├─ eslint.config.mjs
├─ .env.example
├─ scripts/seed.ts                # 1 admin, ~50 doctors, ~2,000 patients over 12 months
├─ tests/                         # *.test.ts (Vitest + supertest + mongodb-memory-server)
└─ src/
   ├─ server.ts                   # connect DB → listen; graceful shutdown on SIGTERM/SIGINT
   ├─ app.ts                      # helmet, json limit, pino-http, routes, 404, error handler
   ├─ config/
   │  ├─ env.ts                   # Zod-validated process.env (fail fast)
   │  ├─ db.ts                    # mongoose connect, autoIndex only outside production
   │  └─ logger.ts                # pino
   ├─ middlewares/
   │  ├─ authenticate.ts          # Bearer JWT (jose) → req.user
   │  ├─ not-found.ts
   │  └─ error-handler.ts         # ApiError / ZodError / Mongo dup key → problem+json
   ├─ modules/
   │  ├─ auth/      auth.routes.ts · auth.controller.ts · auth.service.ts · auth.schema.ts
   │  ├─ users/     user.model.ts
   │  ├─ doctors/   doctor.routes.ts · doctor.controller.ts · doctor.service.ts · doctor.model.ts · doctor.schema.ts
   │  ├─ patients/  patient.routes.ts · patient.controller.ts · patient.service.ts · patient.model.ts · patient.schema.ts
   │  └─ stats/     stats.routes.ts · stats.controller.ts · stats.service.ts
   ├─ routes.ts                   # mounts modules under /api/v1, plus GET /health
   └─ utils/
      ├─ api-error.ts
      ├─ pagination.ts            # parse page/limit, build meta
      └─ escape-regex.ts
```

---

## 5. Data Model & Indexes

### User

`email` (unique, lowercase), `passwordHash`, `name`, `role: 'admin'`, timestamps. `passwordHash` has `select: false`.

### Doctor

| Field                 | Type   | Rules                                                 |
| --------------------- | ------ | ----------------------------------------------------- |
| name                  | string | required, 2–100, trimmed                              |
| nameLower             | string | derived (pre-save / pre-update hook), used for search |
| specialization        | string | required, from a fixed list                           |
| hospital              | string | required                                              |
| phone                 | string | required, E.164-ish pattern                           |
| email                 | string | required, unique, lowercase                           |
| createdAt / updatedAt | Date   | timestamps                                            |

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
| doctor           | ObjectId → Doctor | required                                                    |
| timestamps       |                   |                                                             |

| Index (ESR)                           | Serves                                          |
| ------------------------------------- | ----------------------------------------------- |
| `{ doctor: 1, admissionDate: -1 }`    | doctor's patients, patients-per-doctor `$group` |
| `{ condition: 1, admissionDate: -1 }` | condition filter + date sort/range              |
| `{ status: 1, admissionDate: -1 }`    | status filter + date sort/range                 |
| `{ admissionDate: -1 }`               | default list, date range, trend aggregation     |
| `{ nameLower: 1 }`                    | prefix search                                   |

**Query rules**

- `find().select(projection).sort().skip().limit().lean()` runs in parallel with `countDocuments()` (`Promise.all`).
- The doctor name for a patient list is filled in with `populate('doctor', 'name specialization')`, applied **after** `limit`, so it only touches one page of records.
- Pagination is offset-based, with `limit` capped at 100. If the data grows past ~100k records, switch to keyset (cursor) pagination on `(admissionDate, _id)`.
- Stats use aggregation pipelines whose first stage is an index-backed `$match`/`$group`. `$lookup` runs only on the top-N results.

---

## 6. Authentication & Authorization

| Step | Where                        | What                                                                                                                                                                                                                                                                       |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `login-form.tsx`             | Calls `useActionState(login)`. Shows field errors and a pending state.                                                                                                                                                                                                     |
| 2    | `actions/auth.ts`            | Zod-validates input, then `POST /api/v1/auth/login`.                                                                                                                                                                                                                       |
| 3    | `api auth.service`           | bcrypt compare, sign JWT `{ sub, role }` (HS256, 8h). A generic "Invalid credentials" error on failure.                                                                                                                                                                    |
| 4    | `data/session.ts`            | `cookies().set('session', jwt, { httpOnly, secure, sameSite: 'lax', path: '/', expires })`, then `redirect('/dashboard')`.                                                                                                                                                 |
| 5    | `src/proxy.ts`               | On every page request (matcher excludes `_next/static`, `_next/image`, static assets): verify the JWT with jose. A protected route without a valid session goes to `/login`; `/login` with a valid session goes to `/dashboard`.                                           |
| 6    | `data/auth.ts`               | `verifySession = cache(...)` runs in every `data/*` function and every Server Action. If it's invalid, `redirect('/login')`.                                                                                                                                               |
| 7    | `data/api-client.ts`         | Sends `Authorization: Bearer <jwt>`. On a 401 from the API, `redirect('/logout')`: that route handler deletes the cookie and redirects to `/login`. Without it, `proxy.ts` would bounce a still-signed (but rejected) cookie from `/login` back to `/dashboard` in a loop. |
| 8    | `api authenticate.ts`        | Verifies the JWT on every `/api/v1/*` route except `/auth/login`, and attaches `req.user`.                                                                                                                                                                                 |
| 9    | `actions/auth.ts` → `logout` | `deleteSession()`, then `redirect('/login')`.                                                                                                                                                                                                                              |

The JWT payload holds only `sub` and `role`, with no PII, as the Next.js docs advise. The same `JWT_SECRET` is configured in both apps and never prefixed with `NEXT_PUBLIC_`.

---

## 7. API Design (REST, `/api/v1`)

| Method | Path                                            | Success               | Notes                                                                                  |
| ------ | ----------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/health`                                       | 200                   | Liveness check (no auth).                                                              |
| POST   | `/auth/login`                                   | 200 `{ token, user }` |                                                                                        |
| GET    | `/auth/me`                                      | 200                   | Current user.                                                                          |
| GET    | `/doctors`                                      | 200                   | `page, limit, q, specialization, hospital, from, to, sort`                             |
| POST   | `/doctors`                                      | 201 + `Location`      | 409 on duplicate email.                                                                |
| GET    | `/doctors/:id`                                  | 200                   | 404 if missing.                                                                        |
| PATCH  | `/doctors/:id`                                  | 200                   | Partial update.                                                                        |
| GET    | `/doctors/:id/patients`                         | 200                   | Paginated, plus the patient filters.                                                   |
| POST   | `/doctors/:id/patients`                         | 201                   | Adds a patient under this doctor.                                                      |
| GET    | `/patients`                                     | 200                   | `page, limit, q, condition, status, gender, doctorId, from, to, sort`                  |
| POST   | `/patients`                                     | 201                   |                                                                                        |
| GET    | `/patients/:id`                                 | 200                   |                                                                                        |
| PATCH  | `/patients/:id`                                 | 200                   |                                                                                        |
| DELETE | `/patients/:id`                                 | 204                   |                                                                                        |
| GET    | `/stats/summary`                                | 200                   | totalDoctors, totalPatients, avgPatientsPerDoctor, newPatientsThisMonth (one `$facet`) |
| GET    | `/stats/patients-per-doctor?limit=10`           | 200                   | `$group` by doctor → `$sort` → `$limit` → `$lookup`                                    |
| GET    | `/stats/admissions?from&to&interval=day\|month` | 200                   | `$match` admissionDate → `$group` by `$dateTrunc`                                      |
| GET    | `/stats/conditions?from&to`                     | 200                   | `$group` by condition                                                                  |

**Conventions**

- Collection resources use plural nouns. `PATCH` does partial updates. `sort` takes the form `field` or `-field`, checked against an allowlist.
- **List response:** `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }`
- **Errors** follow **RFC 9457 Problem Details** (`application/problem+json`): `{ type, title, status, detail, errors? }`.
- Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500 internal (generic message only; details go to the logs).
- Every `body`, `query` and `params` value is Zod-validated, and `:id` must be a valid ObjectId. Controllers call `schema.parse(req.query)` directly: Express 5 makes `req.query` read-only (so a mutating `validate` middleware doesn't fit), and it forwards the thrown `ZodError` to the error handler, which returns 400. The JSON body size limit is `100kb`.
- Responses are DTOs: no `__v`, no `nameLower`, no `passwordHash`.

---

## 8. Frontend Patterns

| Concern                           | Pattern                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **List pages**                    | The page is a Server Component. `await searchParams` is parsed with `listQuerySchema` (Zod, with defaults), then rendered as `<Suspense key={serializedQuery} fallback={<TableSkeleton/>}><DoctorsTable query={q}/></Suspense>`. A new key shows the skeleton on every filter change.                                                                                                                                                        |
| **Search / filters / pagination** | Client components read `useSearchParams()` and update the URL with `router.replace(pathname + '?' + params, { scroll: false })` inside `startTransition`. Search is debounced by 300 ms, and changing a filter resets `page` to 1. Pagination uses `<Link>`, which gets prefetching.                                                                                                                                                         |
| **Mutations**                     | Forms call `useActionState(serverAction)`. Server-side Zod errors appear inline. `<SubmitButton>` shows the pending state. A toast confirms success. The action calls `revalidatePath('/doctors')` (and `/dashboard`).                                                                                                                                                                                                                       |
| **Delete**                        | A `ConfirmDialog` calls the Server Action inside `startTransition`, with `useOptimistic` to remove the row immediately.                                                                                                                                                                                                                                                                                                                      |
| **Dashboard**                     | Each widget is an async Server Component in its own `<Suspense>`, so they stream independently in parallel. Chart components are `'use client'` and receive plain serializable data as props.                                                                                                                                                                                                                                                |
| **Loading / error**               | `loading.tsx` per segment, `error.tsx` boundaries with retry (`reset()`), `not-found.tsx` for unknown IDs. Empty states include a call to action.                                                                                                                                                                                                                                                                                            |
| **Performance**                   | Server Components by default keep client JS small. `next/font` for fonts. Only the needed columns are fetched. No client-side data cache to sync. Interactive leaves are kept small to limit re-renders.                                                                                                                                                                                                                                     |
| **Responsive**                    | Below `md`, the sidebar becomes a `Sheet` drawer and tables become stacked cards. Layouts are mobile-first, and the app is tested at 375px and 1440px.                                                                                                                                                                                                                                                                                       |
| **Accessibility**                 | Radix primitives handle focus and ARIA. Every input has a label. Errors are linked with `aria-describedby`. Contrast meets WCAG AA.                                                                                                                                                                                                                                                                                                          |
| **Caching**                       | `cacheComponents` is **on**, the Next 16 template default. Static UI (the layout chrome) is prerendered into a static shell. Anything reading `cookies()` or `searchParams`, which is all API data, sits inside `<Suspense>` and streams at request time; with Cache Components, reading them outside a boundary is a build error. API data is not cached with `use cache`, because the session token must never become part of a cache key. |

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
  - bcrypt with cost 12.
  - Zod validation on every input; regex input is escaped; sort fields come from an allowlist (prevents NoSQL injection and ReDoS).
  - Generic 500 messages to clients.
  - `npm audit` in CI.
- **Secrets:** `.env` files are git-ignored, and `.env.example` files are committed.

---

## 10. Environment Variables

**`api/.env.example`**

```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://doctor_tracker_app:<password>@localhost:27017/doctor-tracker?authSource=doctor-tracker
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=8h
SEED_ADMIN_EMAIL=admin@doctortracker.dev
SEED_ADMIN_PASSWORD=ChangeMe@123
```

**`web/.env.example`**

```
API_URL=http://localhost:4000/api/v1     # server-only, intentionally NOT NEXT_PUBLIC_
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

**Phase 5: Dashboard** 11. `api`: `stats` module (summary `$facet`, patients-per-doctor, admissions trend, conditions). 12. `web`: `data/stats.ts`, `/dashboard` with KPI cards, a bar chart, an area chart, a donut chart, a date-range select, and per-widget `<Suspense>`.

**Phase 6: Quality & Delivery** 13. Seed script with realistic data (1 admin, ~50 doctors, ~2,000 patients over 12 months). 14. API tests: auth (401/200), validation (400), duplicate email (409), list filters and pagination, stats shape. 15. Check index usage with `explain('executionStats')` on the main queries. 16. UX pass: responsive (375px/1440px), keyboard, empty/error/loading states; Lighthouse audit. 17. Deploy: Atlas → Render (api) → Vercel (web). Set env vars and check `/health`. 18. README: elevator pitch, setup, architecture diagram, technical decisions **D1** and **D2**, desktop and mobile screenshots, demo credentials.

### Verification Checklist

- [ ] `npm run seed`, then `npm run dev` starts both apps, and the seeded admin can log in.
- [ ] Opening `/doctors` without a session redirects to `/login`; `GET /api/v1/doctors` without a token returns 401 problem+json.
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
