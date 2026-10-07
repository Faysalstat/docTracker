# Doctor Tracker: Product Requirements Document

|                  |                                                             |
| ---------------- | ----------------------------------------------------------- |
| Version          | 1.0                                                         |
| Date             | 2026-10-07                                                  |
| Status           | Draft                                                       |
| Source           | `doc/Fullstack_Task_Frontend_Focused_Updated_1 (1) (1).pdf` |
| Technical design | [architecture.md](architecture.md)                          |

## 1. Overview

Doctor Tracker is a secure admin web app for managing doctors and their patients. Only signed-in admins can open the portal. From there they register doctors, manage each doctor's patients, find records quickly with search, filters and pagination, and track activity on an analytics dashboard. The product is judged on a clean, responsive UI; fast, index-backed queries; and meaningful data visualization.

## 2. Goals & Non-goals

**Goals**

- Secure, authenticated access to every page and API.
- Fast doctor and patient management with search, filters and pagination.
- A dashboard that gives clear insight into doctors, patients and trends over time.
- A modern, responsive, accessible UI.

**Non-goals (v1)**

- Public sign-up, multiple roles or multi-tenancy
- Appointments, billing, or medical records/EHR
- Patient-facing features
- Deleting doctors

## 3. Users

| Persona | Description                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Admin   | Internal staff who manage doctors and patients. Admin is the only role. Accounts are seeded; there is no self-registration. |

## 4. Assumptions (gaps in the source spec)

| Topic                               | Assumption                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Architecture                        | The spec is contradictory. The visible, updated version wins: a Next.js client plus a standalone Express REST API. |
| Patient fields                      | The spec doesn't define them, so the PRD sets them (see §5.3).                                                     |
| Patient ↔ doctor                    | Each patient belongs to exactly one doctor.                                                                        |
| "Delete patient from doctor's list" | Deletes the patient record, after a confirmation step.                                                             |
| "Patient condition"                 | The patient's medical condition, from a fixed list.                                                                |
| "Date-wise filter"                  | Doctors filter by created date; patients filter by admission date.                                                 |
| Doctor edit                         | Included because it costs little. Doctor delete is out of scope.                                                   |

## 5. Functional Requirements

Priority: **P0** = required by the spec · **P1** = small enhancement.

### 5.1 Authentication

| ID     | Requirement                                                             | Pri |
| ------ | ----------------------------------------------------------------------- | --- |
| AUTH-1 | An admin signs in with email and password.                              | P0  |
| AUTH-2 | Unauthenticated users who open any app page are redirected to `/login`. | P0  |
| AUTH-3 | Every API endpoint except login returns 401 when no session is present. | P0  |
| AUTH-4 | An admin can log out, which ends the session.                           | P0  |
| AUTH-5 | Sessions expire after 8h. An expired session redirects to login.        | P0  |
| AUTH-6 | Login errors stay generic ("Invalid credentials").                      | P0  |

**Acceptance:** opening `/doctors` without signing in redirects to `/login`. After signing in, the admin lands on `/dashboard`.

### 5.2 Doctor Management

Doctor fields: **name, specialization, hospital, phone, email**. All are required, and email must be unique and valid.

| ID    | Requirement                                                                                   | Pri |
| ----- | --------------------------------------------------------------------------------------------- | --- |
| DOC-1 | Create a doctor through a validated form.                                                     | P0  |
| DOC-2 | List all doctors in a paginated table (page size 10/20/50).                                   | P0  |
| DOC-3 | Search doctors by name prefix, email or phone, debounced as the user types.                   | P0  |
| DOC-4 | Filter doctors by created-date range, specialization and hospital.                            | P0  |
| DOC-5 | Sort doctors by name or created date.                                                         | P1  |
| DOC-6 | Open a doctor detail page showing the profile and a paginated list of that doctor's patients. | P0  |
| DOC-7 | Add a new patient under a specific doctor from the detail page.                               | P0  |
| DOC-8 | Delete a patient from the doctor's patient list, after confirmation.                          | P0  |
| DOC-9 | Edit a doctor's details.                                                                      | P1  |

**Acceptance:** search, filter and page state appear in the URL. Refreshing the page or using back/forward restores the same view.

### 5.3 Patient Management

Patient fields:

| Field         | Type      | Rules                                                       |
| ------------- | --------- | ----------------------------------------------------------- |
| name          | text      | required                                                    |
| age           | number    | required, 0–120                                             |
| gender        | enum      | Male / Female / Other                                       |
| phone         | text      | required                                                    |
| email         | text      | optional, valid email                                       |
| condition     | enum      | Diabetes, Hypertension, Asthma, Cardiac, Respiratory, Other |
| status        | enum      | Admitted, Under Treatment, Recovered                        |
| admissionDate | date      | required, not in the future                                 |
| doctor        | reference | required                                                    |

| ID    | Requirement                                                                    | Pri |
| ----- | ------------------------------------------------------------------------------ | --- |
| PAT-1 | A dedicated page lists all patients, paginated.                                | P0  |
| PAT-2 | Search patients by name prefix, email or phone.                                | P0  |
| PAT-3 | Filter patients by admission-date range, condition, status, doctor and gender. | P0  |
| PAT-4 | Edit a patient's information.                                                  | P0  |
| PAT-5 | Delete a patient, after confirmation.                                          | P0  |
| PAT-6 | Create a patient from the patients page, choosing the doctor.                  | P1  |
| PAT-7 | Sort patients by name or admission date.                                       | P1  |

### 5.4 Dashboard & Analytics

| ID     | Requirement                                                                                              | Pri |
| ------ | -------------------------------------------------------------------------------------------------------- | --- |
| DASH-1 | KPI cards: total doctors, total patients, average patients per doctor, new patients this month.          | P0  |
| DASH-2 | Bar chart of patients per doctor (top 10).                                                               | P0  |
| DASH-3 | Area chart of patient admissions over time, grouped by day or month.                                     | P0  |
| DASH-4 | Donut chart of patient distribution by condition.                                                        | P1  |
| DASH-5 | A date-range control (last 7 days / 30 days / 12 months / custom) that applies to the date-based charts. | P0  |
| DASH-6 | All figures are computed on the server with aggregation queries, never in the browser.                   | P0  |

## 6. UI/UX Requirements

- Layout: a persistent sidebar with Dashboard, Doctors and Patients. It collapses to a drawer on mobile. The top bar holds the user menu and logout.
- Responsive from 375px to 1440px and wider. Tables turn into stacked cards on small screens.
- Every data view handles its states: loading (skeletons), empty (with a call to action), error (with retry), and success (toast).
- Destructive actions always ask for confirmation.
- Forms show errors inline, disable submit while sending, and keep their input when submission fails.
- Accessibility: keyboard navigable, visible focus, labelled inputs, WCAG AA contrast.
- Consistent spacing, typography and visual hierarchy across all pages.

## 7. Non-functional Requirements

| Area            | Requirement                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Performance     | Search, filter and pagination queries are backed by MongoDB indexes (verified with `explain()`). API p95 is under 300 ms on the seed dataset. No unnecessary re-renders; charts are lazy-loaded. |
| Security        | httpOnly session cookie, bcrypt password hashes, input validation on every endpoint, security headers, secrets kept only in env.                                                                 |
| Reliability     | One consistent error response format. Server errors are logged and never leak stack traces to the client.                                                                                        |
| Scalability     | Stateless API, page size capped at 100, layered modular code.                                                                                                                                    |
| Maintainability | TypeScript throughout, a clean folder structure, reusable UI components, and API tests for auth and list endpoints.                                                                              |

## 8. Deliverables

- A GitHub repo with `/web` (Next.js) and `/api` (Express), each with an `.env.example`.
- A deployed app link and demo admin credentials.
- A seed script with realistic sample data (~50 doctors, ~2,000 patients over 12 months).
- A `README.md` with an elevator pitch, setup guide, system architecture, two technical-decision deep dives, and desktop and mobile screenshots.

## 9. Evaluation Criteria → Coverage

| Criterion                        | Covered by                                |
| -------------------------------- | ----------------------------------------- |
| Code structure & cleanliness     | NFR Maintainability, architecture.md      |
| Query optimization               | DOC-3/4, PAT-2/3, DASH-6, NFR Performance |
| UX/UI quality                    | §6                                        |
| Data visualization               | DASH-1…5                                  |
| Performance efficiency           | NFR Performance                           |
| Authentication                   | AUTH-1…6                                  |
| Next.js & MongoDB best practices | architecture.md                           |
| Scalability                      | NFR Scalability                           |

## 10. Release Milestones

1. Foundation and Auth
2. Doctors
3. Patients
4. Dashboard
5. Polish, tests, deploy, README
