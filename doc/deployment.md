# Doctor Tracker: Free Deployment Guide

How to put Doctor Tracker online on free tiers: **Vercel** (web), **Render** (API) and **MongoDB Atlas** (database). Follow the steps in order. Expect about 45 minutes the first time.

> Free-tier limits change. Check each provider's pricing page when you sign up. The numbers below were correct when this guide was written (October 2026).

---

## 1. Plan at a glance

| #   | Phase        | What you do                                                                        | Result                               |
| --- | ------------ | ---------------------------------------------------------------------------------- | ------------------------------------ |
| 0   | Prepare repo | Commit, check that everything passes, merge into the `deploy` branch, push to GitHub            | A clean branch to deploy from        |
| 1   | Database     | Create a free Atlas M0 cluster, an app user and network access                     | A `mongodb+srv://` connection string |
| 2   | Prepare DB   | From your machine: sync indexes, seed the admin account (and optionally demo data) | Production DB is ready               |
| 3   | API          | Create a Render web service from the repo and set its env vars                     | `https://<api>.onrender.com/api`     |
| 4   | Web          | Import the repo into Vercel (root `web/`) and set `API_URL` and `JWT_SECRET`       | `https://<web>.vercel.app`           |
| 5   | Keep-warm    | Ping the API every 10 minutes so Render's free instance never sleeps               | No first-request timeouts            |
| 6   | Verify       | Run the smoke test checklist                                                       | Working app                          |
| 7   | Ongoing      | Auto-deploy on push, run index syncs after schema changes, back up the database    | Repeatable releases                  |

### Target architecture

```
Browser ──HTTPS──> Vercel (Next.js 16, web/)  ──HTTPS, Bearer JWT──>  Render (Express API, api/)  ──TLS──>  MongoDB Atlas M0
                   session cookie (httpOnly)       server-to-server         /api health check              doctor-tracker DB
                                                                                 ^
                                              cron-job.org ── GET /api every 10 min (keep-warm)
```

The browser only ever talks to Vercel. Next.js calls the API from the server ([architecture.md, D1](architecture.md)). That means:

- The API needs **no CORS origin**. Leave `CORS_ORIGIN` empty.
- `API_URL` is a **server-only** variable on Vercel. It is never `NEXT_PUBLIC_`.
- Both apps must share **the same `JWT_SECRET`**. The API signs the token, and Next.js verifies the session cookie with that secret.

---

## 2. Hosting providers

### Recommended stack (all free, no credit card for the free tiers)

| Part     | Provider                          | Why it fits this app                                                                                                                                                                                                 | Free-tier limits that matter                                                                                                                              |
| -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web      | **Vercel** (Hobby)                | Made by the Next.js team. Next 16 features (Server Actions, `proxy.ts`, cache components, streaming) work with no config. Supports npm workspace monorepos. Previews for every pull request.                         | Personal, non-commercial use only. Function time and bandwidth caps are far above what this app needs.                                                    |
| API      | **Render** (Free web service)     | Runs `node dist/app.js` as a normal long-lived process, which matches how [api/app.ts](../api/app.ts) works (connection pool, graceful `SIGTERM`). Native `bcrypt` builds on Linux. Deploys on every push to GitHub. | Sleeps after 15 min with no traffic and takes ~30–60 s to wake (fixed in step 5). 750 instance hours per month, enough for one service running all month. |
| Database | **MongoDB Atlas** (M0)            | Managed MongoDB 8. The app uses no transactions, so a shared cluster is enough.                                                                                                                                      | 512 MB storage (the demo data uses a few MB). No automated backups on M0; use `mongodump` (section 9).                                                    |
| Pinger   | **cron-job.org** (or UptimeRobot) | Free scheduled HTTP pings that keep the Render instance awake.                                                                                                                                                       | Free.                                                                                                                                                     |

### Why not Vercel for the API too?

You can, but it needs code changes, and it suits this API less well:

- Vercel runs Express as **serverless functions**. [api/app.ts](../api/app.ts) only listens when run directly, and connects to Mongo once at startup. You would need a new entry point that exports `app` and caches the Mongoose connection across invocations.
- The pool settings in [db.config.ts](../api/src/config/db.config.ts) (`minPoolSize: 5`) assume one long-lived process. Many cold function instances would open many Atlas connections. M0 allows 500.
- The upside is that it never sleeps. If Render's cold starts bother you and the keep-warm ping is not enough, this is the move. Treat it as a separate task.

### Alternatives

| Part | Option                        | Notes                                                                                                   |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| API  | Koyeb (free instance)         | Also runs Node services from GitHub and scales to zero when idle. Fewer regions on the free tier.       |
| API  | Railway / Fly.io              | Good platforms, but no lasting free tier now (trial credit or pay as you go).                           |
| Web  | Netlify                       | Supports Next.js through its adapter. Newest Next features sometimes arrive later than on Vercel.       |
| Web  | Cloudflare Workers (OpenNext) | Generous free tier, but needs the OpenNext adapter and a Workers build config. More work for this repo. |

**Use one region for all three.** Each page load makes several web → API → DB hops. Recommended: **US East** everywhere: Render _Virginia (US East)_, Atlas _AWS us-east-1 (N. Virginia)_, Vercel function region _Washington, D.C. (iad1)_, which is Vercel's default. If your users are in Europe, use Render _Frankfurt_, Atlas _eu-central-1_ and Vercel _fra1_ instead.

---

## 3. Step 0: Prepare the repository

Render and Vercel deploy from GitHub (`origin` = `github.com/Faysalstat/docTracker`), so the code you want live must be pushed.

1. Commit the current work on `refactor/service-rules-alignment` (the backend restructure is not committed yet).
2. Run every check from the repo root. They must all pass:

   ```powershell
   npm ci
   npm run lint
   npm run typecheck
   npm test            # needs the local Mongo from `npm run infra:up`
   npm run build       # builds api/dist and web/.next, as the hosts will
   ```

3. Merge your work into the `deploy` branch and push it. Both hosts deploy `deploy` (the production branch). Render reads it from `render.yaml`; in Vercel set it under *Settings → Git → Production Branch*.
4. Make sure no `.env` or `.env.local` file is tracked: `git ls-files | Select-String "\.env"` should list only `.env.example` files.

---

## 4. Step 1: Create the MongoDB Atlas database

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>, then create a project named `doctor-tracker`.
2. **Create** → pick the **Free** card (this is the M0 tier; the UI no longer shows "M0"). Do **not** pick **Flex**, which is paid. Provider **AWS**, region **N. Virginia (us-east-1)** (only some regions offer the free tier) → name `doctor-tracker` → **Create Deployment**.
   - No Free card? A project can have only one free cluster. Create a new project, or use the existing free cluster.
3. **Database Access → Add New Database User**
   - Authentication: Password. Username `doctor_tracker_app`. Click _Autogenerate Secure Password_ and save it in your password manager.
   - Built-in role: **Specific privileges → `readWrite` on database `doctor-tracker`** (least privilege, same as the local Docker setup). Do not give it Atlas admin.
4. **Network Access → Add IP Address → `0.0.0.0/0`** (allow from anywhere).
   - Why: Render's free tier has no fixed outbound IPs, so you cannot allowlist it. A strong generated password and TLS (on by default) protect the cluster.
   - Also add your own IP if you prefer to remove `0.0.0.0/0` later and connect from a paid static-IP host.
5. **Connect → Drivers** and copy the connection string. Add the database name `doctor-tracker` before the `?`:

   ```
   mongodb+srv://doctor_tracker_app:<password>@doctor-tracker.xxxxx.mongodb.net/doctor-tracker?retryWrites=true&w=majority&appName=doctor-tracker
   ```

   If the password contains `@ : / ? # [ ] %`, URL-encode it (for example `@` becomes `%40`) or generate one without them.

---

## 5. Step 2: Prepare the production database (from your machine)

`autoIndex` is **off in production** ([db.config.ts](../api/src/config/db.config.ts)), so create the indexes yourself before the first deploy. Without them, the unique email indexes are missing and duplicate checks won't work.

### Where each value lives

| File / place               | Database it points at  | Committed?                   | Used by                                                                    |
| -------------------------- | ---------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `api/.env`                 | Local Docker MongoDB   | No                           | `npm run dev`, `npm test`, `npm run seed`                                  |
| `api/.env.production`      | **Atlas** (production) | No (`.env.*` is git-ignored) | The `*:prod` scripts below, and the values you copy into Render and Vercel |
| `api/.env.example`         | Placeholders only      | **Yes**                      | Documentation. Never put real values here.                                 |
| Render / Vercel dashboards | Atlas                  | n/a                          | The deployed apps                                                          |

Keeping production in its own file means `npm run dev` and `npm test` (which create and delete records) can never reach production by mistake.

Create `api/.env.production` with the same keys as `.env.example`, using production values: `NODE_ENV=production`, the Atlas `MONGO_URI`, a **new** `JWT_SECRET`, and your real admin email and a strong password.

> Values in env files must not contain `#`. Node's `--env-file` treats it as the start of a comment and cuts the value off there. Use letters and digits only for generated passwords.

Then run these from `api/`:

```powershell
npm run sync-indexes:prod   # 1. Create the indexes declared in the schemas
npm run seed:prod           # 2. Create (or reset) the admin account from SEED_ADMIN_*
npm run build
npm run serve:prod          # 3. Optional: run the built API locally against Atlas (port 4000; stop `npm run dev` first)
```

Optional, for a demo or assessment: load 50 doctors and 2,000 patients. This **replaces** all doctors and patients, and the seed refuses to do it when `NODE_ENV=production`. Override that on purpose, for this one command only, and never on real data:

```powershell
$env:NODE_ENV = "development"; npm run seed:prod -- --reset-demo-data; Remove-Item Env:NODE_ENV
```

Your IP must be allowed in Atlas Network Access (step 1.4 covers this).

`migrate:rules-alignment` is **not** needed: a fresh Atlas database already has the new collection and field names.

---

## 6. Step 3: Deploy the API on Render

### Recommended: Blueprint (settings come from the repo)

[`render.yaml`](../render.yaml) at the repo root holds every setting below, so you don't type them in.

1. Sign up at <https://render.com> with GitHub and allow access to the `docTracker` repository.
2. **New → Blueprint** → choose the repository and branch `deploy`.
3. Render reads `render.yaml` and asks for the two secrets (`sync: false`). Paste `MONGO_URI` and `JWT_SECRET` from `api/.env.production`.
4. **Deploy Blueprint**, then continue at item 5 below to check the logs.

Changes to the service settings go in `render.yaml` and deploy with the next push. Secret values stay only in the Render dashboard.

### Manual alternative: Web Service

1. Sign up at <https://render.com> with GitHub and allow access to the `docTracker` repository.
2. **New → Web Service** → choose the repository.
3. Settings:

   | Field             | Value                                                                                | Why                                                                                                                        |
   | ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
   | Name              | `doctor-tracker-api`                                                                 | Sets the URL: `https://doctor-tracker-api.onrender.com`. If the name is taken, Render adds a suffix; use the URL it shows. |
   | Region            | Virginia (US East)                                                                   | Same region as Atlas.                                                                                                      |
   | Branch            | `deploy`                                                                             |                                                                                                                            |
   | Root Directory    | _(leave empty)_                                                                      | The repo is an npm workspace with one `package-lock.json` at the root, so install from the root.                           |
   | Runtime           | Node                                                                                 |                                                                                                                            |
   | Build Command     | `npm ci --include=dev -w api --include-workspace-root=false && npm run build -w api` | Installs only the API packages. `--include=dev` keeps TypeScript, which `NODE_ENV=production` would otherwise skip.        |
   | Start Command     | `npm run serve -w api`                                                               | Runs `node dist/app.js`.                                                                                                   |
   | Instance Type     | **Free**                                                                             |                                                                                                                            |
   | Health Check Path | `/api`                                                                               | Public route that returns `{ "message": "API is alive" }`. Under _Advanced_.                                               |
   | Auto-Deploy       | On commit                                                                            |                                                                                                                            |

4. **Environment variables** (_Advanced → Add Environment Variable_):

   | Key              | Value                                                                                  |
   | ---------------- | -------------------------------------------------------------------------------------- |
   | `NODE_VERSION`   | `22.12.0` or later 22.x (the repo's `engines` requires `>=22.12.0`)                    |
   | `NODE_ENV`       | `production`                                                                           |
   | `SERVER_PORT`    | `10000` (Render routes traffic to port 10000; the app reads `SERVER_PORT`, not `PORT`) |
   | `MONGO_URI`      | Copy from `api/.env.production`                                                        |
   | `JWT_SECRET`     | Copy from `api/.env.production` (new secret, not the dev one)                          |
   | `JWT_EXPIRES_IN` | `8h`                                                                                   |
   | `CORS_ORIGIN`    | _(do not set)_. The browser never calls the API directly.                              |

   Generate the secret once and keep it. You will paste the same value into Vercel:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Do **not** set the `SEED_*` variables on Render. Seeding was done in step 2.

5. **Create Web Service.** Watch the logs until you see:

   ```
   database connected!
   server is running on 10000
   ```

6. Check it: open `https://doctor-tracker-api.onrender.com/api` and you should get `{"message":"API is alive"}`. `GET /api/doctor/list` with no token should return **401**.

---

## 7. Step 4: Deploy the web app on Vercel

1. Sign up at <https://vercel.com> with GitHub. **Add New → Project** → import `docTracker`.
2. Settings:

   | Field            | Value                                                                                             |
   | ---------------- | ------------------------------------------------------------------------------------------------- |
   | Framework Preset | Next.js (detected)                                                                                |
   | Root Directory   | `web`                                                                                             |
   | Build / Install  | Leave the defaults. Vercel finds the root lockfile and installs the workspace.                    |
   | Node.js Version  | 22.x (_Settings → Build and Deployment_ after the first deploy, if it is not already the default) |

3. **Environment Variables** (Production, plus Preview if you want preview deploys to work):

   | Key          | Value                                                                    |
   | ------------ | ------------------------------------------------------------------------ |
   | `API_URL`    | `https://doctor-tracker-api.onrender.com/api` (your Render URL + `/api`) |
   | `JWT_SECRET` | **Exactly the same value** as on Render                                  |

   Both are validated at startup by [web/src/data/env.ts](../web/src/data/env.ts). A missing value or a secret shorter than 32 characters fails the build or the first request, which is what you want.

4. **Deploy.** When it finishes, open `https://<project>.vercel.app`.
5. Optional: _Settings → Functions → Function Region_ → make sure it matches the Render and Atlas region (`iad1` for US East).
6. Optional: _Settings → Domains_ to add your own domain. HTTPS is automatic. The session cookie is `secure` in production ([session.ts](../web/src/data/session.ts)), which works because Vercel always serves HTTPS.

---

## 8. Step 5: Keep the API warm

**Why this step is needed:** the web app gives up on API calls after **10 seconds** (`REQUEST_TIMEOUT_MS` in [api-client.ts](../web/src/data/api-client.ts)). A sleeping Render instance takes 30–60 s to wake. Without a ping, the first visitor after 15 idle minutes sees _"The service is temporarily unavailable"_.

1. Sign up at <https://cron-job.org> (free).
2. **Create cronjob**:
   - URL: `https://doctor-tracker-api.onrender.com/api`
   - Schedule: every **10 minutes**
   - Notify on failure: on (you get an email if the API goes down).
3. One always-on service uses about 744 of the 750 free instance hours a month. **Ping only one Render service.** A second always-on free service would run out of hours.

If you'd rather not keep it awake, raise `REQUEST_TIMEOUT_MS` to about 60 s so the first request waits for the wake-up. That is slower, but nothing fails.

---

## 9. Step 6: Smoke test

Do this on the Vercel URL in a private window:

- [ ] `/` redirects to `/login`.
- [ ] Wrong password shows an error. The admin from step 2 can log in and lands on `/dashboard`.
- [ ] Dashboard charts and stats load (with demo data, they show 12 months of data).
- [ ] Doctors: list, search, create, edit, open a doctor's detail page.
- [ ] Patients: filters, create, edit, delete.
- [ ] Creating a doctor with an email that already exists shows "already exists". This proves the indexes from step 2 are in place.
- [ ] Log out, then try `/dashboard`: you are sent back to `/login`.
- [ ] DevTools → Application → Cookies: the session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] DevTools → Network: no requests go to `onrender.com` from the browser. Only Vercel is called.

Optional: run the Playwright suite against production. Only do this with a demo database, because the tests create and delete records:

```powershell
$env:E2E_BASE_URL = "https://<project>.vercel.app"
npm run test:e2e
```

---

## 10. Step 7: Running it after launch

| Task                                 | How                                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release                              | Merge into `deploy`. Render and Vercel both deploy automatically. Pull requests get a Vercel preview, which calls the production API unless you set a different Preview `API_URL`.                      |
| Schema / index change                | After deploying, run `npm run sync-indexes -w api` from your machine with `$env:MONGO_URI` set to Atlas (as in step 2).                                                                               |
| Data migration                       | Back up first (below), then run the `scripts/migrate-*.ts` script the same way.                                                                                                                       |
| Backup (M0 has no automatic backups) | `mongodump --uri "<atlas uri>" --out api/backups/$(Get-Date -Format yyyy-MM-dd)`. `api/backups/` is git-ignored. Needs [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools). |
| Rotate `JWT_SECRET`                  | Change it on **both** Render and Vercel, then redeploy both. Everyone is logged out. That is expected.                                                                                                |
| Logs                                 | Render → service → _Logs_ (API `console.log/error`). Vercel → project → _Logs_ (server components and actions).                                                                                       |
| Rollback                             | Render → _Events_ → pick an earlier deploy → _Rollback_. Vercel → _Deployments_ → earlier deploy → _Promote to Production_.                                                                           |

---

## 11. Troubleshooting

| Symptom                                                                 | Likely cause and fix                                                                                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render log: `Error creating database connection … ServerSelectionError` | Atlas Network Access is missing `0.0.0.0/0`, the password needs URL-encoding, or the user/database name in the URI is wrong.                                   |
| Render log: `JWT_SECRET must be set to at least 32 characters`          | The env var is missing or too short on Render.                                                                                                                 |
| Render deploy times out: "no open port detected"                        | `SERVER_PORT` is not `10000`.                                                                                                                                  |
| Render build: `tsc: not found`                                          | The build command is missing `--include=dev`.                                                                                                                  |
| Vercel build or page error: Zod error about `API_URL` / `JWT_SECRET`    | The env var is missing in Vercel, or `API_URL` is not a full `https://` URL. After changing env vars, **redeploy**.                                            |
| Login works, but every page then goes back to `/login`                  | `JWT_SECRET` differs between Vercel and Render, so Next.js can't verify the cookie the API's token produced. Paste the same value into both and redeploy both. |
| "The service is temporarily unavailable" on the first visit             | The Render instance was asleep. Check the cron-job.org job is running (step 5).                                                                                |
| Duplicate emails are accepted                                           | Indexes were not synced. Run `npm run sync-indexes -w api` against Atlas.                                                                                      |
| Pages feel slow                                                         | The services are in different regions. Put Vercel, Render and Atlas in the same region (section 2).                                                            |

---

## 12. Secrets checklist

- [ ] The production `JWT_SECRET` is new (not the dev value), at least 32 characters, and the same on Render and Vercel. It is stored only in those dashboards and your password manager.
- [ ] The Atlas user has `readWrite` on `doctor-tracker` only.
- [ ] The production admin password is not `ChangeMe@123`.
- [ ] No `.env` file is committed. `SEED_*` variables are not set on Render.
- [ ] `API_URL` and `JWT_SECRET` have no `NEXT_PUBLIC_` prefix.
