# Final Project Report

**Project name:** PMU Student Registration System with AI Chatbot and Controlled Authentication  

**University:** Prince Mohammad Bin Fahd University (PMU)  

**College:** College of Engineering and Computer Science  

**Team members:** Abdullah Almosharef · Abdulaziz Alrumaih · Rakan Almutairi · Fahad Almurshed  

**Document purpose:** Technical summary of the implemented system, derived from the repository structure, `package.json` manifests, Express route modules, Next.js App Router pages, SQLite schema, and shared authentication libraries.

---

## 1. Project Overview

### 1.1 Purpose and goals

The project delivers a **web-based academic registration platform** aligned with PMU-style operations: controlled identities (`@pmu.edu.sa`), **role-separated portals** (student, faculty, administrator), **course catalog and sections**, **cart-style registration** with server-side validation (prerequisites, credit caps, schedule conflicts, capacity), and **AI-assisted guidance** for students plus an **AI admin assistant** grounded in live database metrics.

Secondary goals include **operational safety** (password hashing, JWT sessions in HttpOnly cookies, admin re-authentication for destructive actions), **import tooling** for bulk student/faculty onboarding from spreadsheets, and **observability-friendly** health and error handling on the API tier.

### 1.2 Problems solved

- **Fragmented registration workflows:** Consolidates browsing sections, building a cart, confirming registration, viewing schedule and grades, and faculty grade entry behind one stack.
- **Identity and access control:** Enforces PMU email conventions, distinguishes roles, blocks inactive accounts at login, and gates Next.js routes in middleware.
- **Administrative workload:** Dashboard metrics, user lifecycle (create, activate/deactivate, delete with safeguards), course/section management, registration window controls, and AI summarization over JSON context.
- **Safe AI use:** Student and admin models receive **non-hallucinated** academic context assembled from SQLite; admin destructive flows use **explicit confirmation and password verification** rather than trusting the model alone.

### 1.3 Target users

| User type | Primary needs met by the system |
|-----------|-----------------------------------|
| **Students** | Self-service registration (when open), schedule and grades, profile completion, student-facing chat assistant with registration context. |
| **Faculty** | Section rosters, grade entry and letter/numeric grade logic, profile and teaching overview. |
| **Administrators** | User CRUD, bulk import (Excel/CSV), registration analytics via AI context, AI-assisted delete flow, course catalog administration, registration settings. |

---

## 2. Tech Stack (with justification)

The codebase is a **monorepo**: root `package.json` runs **Next.js** and **Express** together via `concurrently`. **TypeScript** is used on both tiers; the backend resolves `@/*` to `../frontend/*` first, so **shared libraries** (JWT, auth helpers, email rules, student helpers, grade math) live under `frontend/` and are reused by Express handlers—reducing duplication and drift between client and server rules.

### 2.1 Root (`package.json`)

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **concurrently** | ^9.2.1 | Single command to run API and UI during development and demos | `npm run dev` / `dev:all` starts `frontend` and `backend` dev servers together |

### 2.2 Backend (`backend/package.json`)

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **express** | ^5.2.1 | Mature HTTP server, routing, middleware ecosystem | REST API, JSON body parsing, cookie parsing, CORS |
| **better-sqlite3** | ^12.9.0 | Fast, synchronous SQLite binding suitable for small-to-medium academic datasets | All persistence: users, courses, registrations, grades, settings |
| **bcrypt** | ^6.0.0 | Industry-standard password hashing | Login verification, registration, admin import hashing |
| **jose** | ^6.2.2 | Modern JWT/JWA implementation | Token signing/verification in shared `frontend/lib/jwt.ts` (`signAuthToken`, `verifyAuthToken`, `rotateAuthToken`) |
| **jsonwebtoken** | ^9.0.3 | Common Node JWT package | Listed in `backend/package.json`; project TypeScript paths use **`jose` only** for JWT—`jsonwebtoken` may be removed in a dependency cleanup pass |
| **dotenv** | ^17.4.2 | Load `OPENAI_API_KEY`, ports, CORS origins from env files | `server.ts` loads multiple paths (`workspaceRoot` and `backendRoot`) with `override: true` for predictable config |
| **cors** | ^2.8.6 | Browser security model requires explicit cross-origin policy | Credentials-enabled CORS for Next dev origin → Express |
| **cookie-parser** | ^1.4.7 | Parse `Cookie` header into `req.cookies` | JWT cookie read in `requireAuth` |
| **openai** | ^6.34.0 | Official SDK for chat completions and streaming | `/chat` and `/admin-chat` in `backend/routes/chat.ts` |
| **multer** | ^2.1.1 | Multipart uploads in memory | `POST /admin/import/analyze` file upload |
| **xlsx** | ^0.18.5 | Parse `.xlsx`/`.xls` (and pipeline supports CSV-type flows where applicable) | Import analyze: sheet → row objects |
| **uuid** | ^13.0.0 | Generate unique user IDs on import | `POST /admin/import/execute` |
| **tsx** | ^4.21.0 | Run TypeScript without separate compile step | `server.js` registers tsx and loads `server.ts` |

### 2.3 Frontend (`frontend/package.json`)

Core framework and UI:

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **next** | 15.2.4 | App Router, SSR/SSG, API routes, rewrites for same-origin API | All pages under `frontend/app`, `next.config.mjs` rewrites to Express |
| **react** / **react-dom** | ^19 | UI library aligned with Next 15 | Components, portals, hooks |
| **typescript** | ^5 | Type safety across app and shared libs | Entire TS codebase |
| **tailwindcss** | ^4.1.9 + **@tailwindcss/postcss** | Utility-first styling, rapid UI iteration | Layout, admin/student/faculty shells, AI assistant styling |
| **geist** | ^1.3.1 | Modern font stack | Typography |
| **lucide-react** | ^0.454.0 | Consistent icon set | Navigation and actions |
| **class-variance-authority** | ^0.7.1 | Variant-based component APIs | Shadcn-style UI primitives |
| **clsx** + **tailwind-merge** | ^2.1.1 / ^2.5.5 | Conditional class names without conflicts | Button/input variants |
| **tailwindcss-animate** + **tw-animate-css** | ^1.0.7 / 1.3.3 | Motion utilities | UI polish |

Forms, validation, state:

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **react-hook-form** | ^7.60.0 | Performant forms | Login, registration, profile flows |
| **@hookform/resolvers** | ^3.10.0 | Bridge RHF to schema validators | Zod-powered validation |
| **zod** | 3.25.67 | Runtime schema validation | Request bodies and forms |
| **zustand** | latest | Lightweight client state | Registration/cart-related client state (`registration-store`) |
| **immer** | latest | Immutable updates | State updates where used |

Data visualization and UX:

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **recharts** | 2.15.4 | React charting | Dashboard-style views if used in pages |
| **date-fns** | 4.1.0 | Date manipulation | Scheduling, registration dates |
| **react-day-picker** | 9.8.0 | Calendar UI | Date picking in UI |
| **sonner** | ^1.7.4 | Toast notifications | Success/error feedback |
| **next-themes** | ^0.4.6 | Dark/light theme switching | `theme-provider` |
| **vaul** | ^0.9.9 | Drawer component | Mobile-friendly overlays |
| **cmdk** | 1.0.4 | Command palette pattern | Command-style UI components |
| **input-otp** | 1.4.1 | OTP input primitive | Specialized inputs |

Radix UI primitives (accessibility, unstyled composable widgets)—each package pins a version for reproducible builds; collectively they power **shadcn-style** components under `frontend/components/ui/` (dialogs, dropdowns, tabs, select, toast, etc.):

`@radix-ui/react-accordion` 1.2.2 · `react-alert-dialog` 1.1.4 · `react-aspect-ratio` 1.1.1 · `react-avatar` 1.1.2 · `react-checkbox` 1.1.3 · `react-collapsible` 1.1.2 · `react-context-menu` 2.2.4 · `react-dialog` 1.1.4 · `react-dropdown-menu` 2.1.4 · `react-hover-card` 1.1.4 · `react-label` 2.1.1 · `react-menubar` 1.1.4 · `react-navigation-menu` 1.2.3 · `react-popover` 1.1.4 · `react-progress` 1.1.1 · `react-radio-group` 1.2.2 · `react-scroll-area` 1.2.2 · `react-select` 2.1.4 · `react-separator` 1.1.1 · `react-slider` 1.2.2 · `react-slot` 1.1.1 · `react-switch` 1.1.2 · `react-tabs` 1.1.2 · `react-toast` 1.2.4 · `react-toggle` 1.1.1 · `react-toggle-group` 1.1.1 · `react-tooltip` 1.1.6  

**Why Radix:** keyboard navigation, focus management, and WAI-ARIA patterns without building primitives from scratch. **Use:** admin tables, modals for AI actions/password, student forms, faculty tools.

Auth, database, and server-side alignment with backend:

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **bcrypt** / **@types/bcrypt** | ^6.0.0 / ^6.0.0 | Same algorithm as Express | Any server-side Next route needing hash (if extended) |
| **better-sqlite3** / **@types/better-sqlite3** | ^12.8.0 / ^7.6.13 | Direct SQLite from Next API route | `frontend/app/api/admin/users/[id]/route.ts` transactional delete |
| **jose** | ^6.2.2 | Verify JWT in Edge/middleware and API routes | `middleware.ts`, `jwt.ts`, admin delete route |
| **jsonwebtoken** / **@types/jsonwebtoken** | ^9.0.2 / ^9.0.10 | Optional / unused in current TS sources | JWT implemented with **`jose`** in `frontend/lib/jwt.ts` |
| **cookie-parser** / **@types/cookie-parser** | ^1.4.7 / ^1.4.10 | Cookie parsing if used in custom servers | Parity with Express cookie model |
| **cors** / **@types/cors** | ^2.8.5 / ^2.8.19 | CORS configuration | Dev/prod API access patterns |
| **express** / **@types/express** | ^4.21.1 / ^5.0.6 | Optional local tooling or embedded servers | Version skew vs backend Express 5 noted; production paths use rewrite to dedicated backend |
| **dotenv** | ^17.4.1 | Env for Next and tooling | Client/server configuration |
| **openai** | ^6.33.0 | Potential direct client usage | Primary AI calls are server-side in Express; package available for future client patterns |
| **uuid** | ^11.0.3 | ID generation | Client or server helpers |
| **concurrently** | ^9.2.1 | Same as root | Can run parallel scripts inside `frontend` if needed |

Miscellaneous:

| Technology | Version | Why chosen | Use in project |
|------------|---------|------------|----------------|
| **@vercel/analytics** | 1.3.1 | Deployment analytics | Optional telemetry on Vercel |
| **autoprefixer** | ^10.4.20 | CSS vendor prefixes | PostCSS pipeline |
| **postcss** | ^8.5 | CSS processing | Build |
| **embla-carousel-react** | 8.5.1 | Carousels | Marketing/landing components |
| **react-resizable-panels** | ^2.1.7 | Resizable layouts | Dashboard or assistant layouts |
| **use-sync-external-store** | latest | React 18+ store subscriptions | Libraries that require it |

---

## 3. System Architecture

### 3.1 Monorepo structure

- **`/`** — Orchestration (`package.json`), environment templates, this report.
- **`frontend/`** — Next.js 15 App Router UI, shared `@/lib` and types, middleware, optional Next API routes.
- **`backend/`** — Express API, SQLite file under `backend/data/pmu.db`, route modules, `db/database.ts` initializer (schema + seed + migrations).

### 3.2 Frontend (Next.js App Router)

- Pages live in `frontend/app/**/page.tsx` with role-specific layouts (`student/layout.tsx`, `faculty/layout.tsx`, `admin/layout.tsx`).
- **`frontend/middleware.ts`** enforces authentication on non-public routes, redirects by role, optionally **rotates JWT** on each request (`rotateAuthToken`) to keep active users signed in—complementing the 30-minute JWT expiry configured in `jwt.ts` and cookie max-age in `auth-cookie.ts`.
- **Rewrites:** `frontend/next.config.mjs` maps `source: '/__pmu_backend/:path*'` → `http://127.0.0.1:5001/:path*` so the browser calls **same origin** `/__pmu_backend/...` and Next proxies to Express. **`frontend/lib/api-base.ts`** documents that the browser should use this prefix so **HttpOnly cookies** are sent correctly.

### 3.3 Backend (Express.js)

- **`backend/server.ts`** wires middleware (CORS, JSON, cookies), mounts routers under `/auth`, `/student`, `/faculty`, `/admin`, `/courses`, `/profile`, attaches **`chatRouter`** (for `/chat` and `/admin-chat`), and **`settingsRouter`** at the root path for registration settings and announcements.
- **Port:** `BACKEND_PORT` / `PORT` / default **5001**.

### 3.4 Database (SQLite)

- **`backend/db/schema.sql`** defines core academic tables (users, students, faculty, courses, sections, registrations, grades, announcements, registration_settings).
- **`backend/db/database.ts`** opens `backend/data/pmu.db`, enables WAL, applies schema, runs **legacy column migrations**, seeds demo data if empty, and can apply **`demo-academic.sql`** when sections are missing.

### 3.5 AI integration (OpenAI)

- Configured via **`OPENAI_API_KEY`**; optional **`OPENAI_MODEL`** (defaults to `gpt-4o-mini`).
- **Student chat:** `POST /chat` streams plain text (`text/plain`) for compatibility with `fetch` streaming on the client.
- **Admin chat:** `POST /admin-chat` streams similarly; special cases return either streamed analytics text or a **single JSON string** for delete confirmation (see §8).

### 3.6 Authentication flow (JWT + bcrypt + HttpOnly cookies)

1. **Login:** `POST /auth/login` validates PMU email, checks `users.status === 'active'`, verifies **bcrypt** hash, issues JWT via **`createSessionToken`** (wraps `signAuthToken`), sets **`auth-token`** cookie via **`attachAuthCookie`** (`httpOnly`, `sameSite: 'strict'`, `secure` in production).
2. **Session refresh:** `GET /auth/me` re-issues cookie; middleware **`rotateAuthToken`** may refresh JWT on navigation.
3. **Logout:** `POST /auth/logout` clears cookie.
4. **Authorization:** `requireAuth` reads cookie or `Authorization: Bearer`; `requireRole` enforces student/faculty/admin.

### 3.7 Foreign keys and deletion

- Next API and Express **`deleteUserById`** run **ordered SQL steps** (null foreign keys, delete dependent rows, then profile rows, then `users`) to avoid **`SQLITE_CONSTRAINT_FOREIGNKEY`** errors.

---

## 4. Features Implemented (detailed)

### a) Authentication system

| Feature | Technical behavior | Key files | APIs |
|---------|-------------------|-----------|------|
| Login with JWT | bcrypt verify + `SignJWT` claims (`sub`, `role`, `status`, etc.) | `backend/routes/auth.ts`, `frontend/lib/jwt.ts`, `backend/cookies.ts` | `POST /auth/login` |
| Role-based access | Express `requireRole`; Next `middleware.ts` redirects by `role` | `backend/middleware/auth.ts`, `frontend/middleware.ts` | All secured routes |
| HttpOnly cookie session | `auth-token` cookie | `frontend/lib/auth-cookie.ts`, `backend/cookies.ts` | Login, `/auth/me` |
| Auto logout / session limits | JWT `exp` 30m; cookie max-age 30m; middleware rotation extends activity | `frontend/lib/jwt.ts`, `frontend/lib/auth-cookie.ts`, `frontend/middleware.ts` | Transparent on navigation |
| Admin-controlled activation | Self-registration inserts `status: 'inactive'`; login rejects non-active | `backend/routes/auth.ts` | `POST /auth/register`, `POST /auth/login` |

### b) Student portal

| Feature | Technical behavior | Key files | APIs |
|---------|-------------------|-----------|------|
| Course registration | Cart in `registrations` with `status='cart'`, confirm promotes to `registered` with validations | `backend/routes/students.ts`, `frontend/lib/student-helpers.ts` | `GET/POST/DELETE /student/cart`, `POST /student/registration/confirm` |
| Schedule view | Aggregates registered sections for semester | `frontend/app/student/schedule/page.tsx` | `GET /student/schedule` |
| Profile management | Updates `students` row; may refresh JWT when profile completion changes | `backend/routes/students.ts`, `frontend/app/student/profile/page.tsx` | `GET/PUT /student/profile` |
| Grade viewing | Joins grades, sections, courses | `frontend/app/student/grades/page.tsx` | `GET /student/grades` |
| Overview / dashboard | Semester stats, credit sum | `frontend/app/student/dashboard/page.tsx` | `GET /student/overview` |
| Student AI chatbot | Streaming OpenAI with injected JSON context | `frontend/app/student/chatbot/page.tsx`, `frontend/lib/api/chat.ts` | `POST /chat` |

### c) Admin dashboard

| Feature | Technical behavior | Key files | APIs |
|---------|-------------------|-----------|------|
| User management | List/create/patch/delete users; sync `students`/`faculty` rows on create | `frontend/app/admin/users/page.tsx`, `backend/routes/admin.ts` | `GET/POST /admin/users`, `PATCH /admin/users/:id`, `DELETE /admin/users/:id` |
| Bulk activate/deactivate | Client sends multiple `PATCH` requests (pattern in UI) | `frontend/app/admin/users/page.tsx` | `PATCH /admin/users/:id` |
| Course management | CRUD on `courses` | `frontend/app/admin/courses/page.tsx` | `GET/POST /admin/courses`, `PATCH/DELETE /admin/courses/:id` |
| Registration management | Read/write `registration_settings` aggregate | `frontend/app/admin/registration-control/page.tsx` | `GET/PUT /admin/registration`, `GET/PUT /registration-settings` |
| Dashboard metrics | Counts users, sections, enrollment | `frontend/app/admin/dashboard/page.tsx` | `GET /admin/dashboard`, `GET /admin/registration` |

**eForms (UI):** `frontend/app/student/eforms/page.tsx` and `frontend/app/admin/eforms/page.tsx` implement rich clients that call **`/student/eforms`** and **`/admin/eforms` / `PATCH /admin/eforms/:id`**. These handlers **were not present** in the scanned `backend/routes/*.ts` files at the time of this report—the UI anticipates those endpoints, and **`eform_requests`** is referenced in **delete transactions** (`admin.ts`, Next delete route) for referential cleanup. For a production deployment, either add the missing routes and a migration for `eform_requests`, or align the UI with the implemented API.

### d) AI admin assistant

| Capability | Technical behavior | Key files | APIs |
|------------|-------------------|-----------|------|
| Registration analytics | `buildAdminChatContext` serializes counts, low enrollment, popularity | `backend/lib/chat-context.ts`, `backend/routes/chat.ts` | `POST /admin-chat` |
| Low enrollment detection | SQL: sections under 20% capacity for current semester | `backend/lib/chat-context.ts` | (in admin context) |
| Inactive users report | `counts.inactiveUsers` | `backend/lib/chat-context.ts` | (in admin context) |
| Export student list | Model can be asked to format lists from context (no direct file export API in scanned routes) | `frontend/app/admin/ai-assistant/page.tsx` | `POST /admin-chat` |
| AI-powered user deletion | Regex intent → DB lookup → JSON payload with `action` | `backend/routes/chat.ts`, `frontend/app/admin/ai-assistant/page.tsx` | `POST /admin-chat`, `DELETE /admin/ai-actions` |
| Excel/CSV import | Multer + xlsx, type detection / `forced_type`, AI validation pass, bcrypt execute | `backend/routes/admin.ts` | `POST /admin/import/analyze`, `POST /admin/import/execute` |

**Delete flow details:** `extractDeleteQuery` / `findDeleteCandidate` support English and Arabic phrasing and match **user id, email, student_id, faculty_id**, and names. Response returns JSON with `action.type = 'delete_user'`. **`DELETE /admin/ai-actions`** requires `admin_password` and bcrypt verification before `deleteUserById`.

### e) Security features

- **bcrypt** password storage and verification.
- **JWT** with short lifetime; **HttpOnly** + **SameSite=Strict** cookies.
- **Role-based** Express and Next middleware.
- **Admin password** re-verification for **`DELETE /admin/ai-actions`** and **`POST /admin/import/execute`**.
- **Self-delete prevention** and **last-admin deletion prevention** in shared delete logic.
- **Foreign-key-safe** ordered deletes and nulling of referencing columns.

---

## 5. Database design

The following tables are defined in **`backend/db/schema.sql`** (authoritative for core academics):

### 5.1 `users`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Internal user id (UUID or prefixed ids in seeds) |
| `email` | TEXT UNIQUE | Login identifier (`@pmu.edu.sa`) |
| `password_hash` | TEXT | bcrypt hash |
| `role` | TEXT | `student` \| `faculty` \| `admin` |
| `status` | TEXT | `active` \| `inactive` |
| `created_at`, `last_login` | TEXT | Audit / analytics |

**Relationships:** Referenced by `students.user_id`, `faculty.user_id`, `sections.faculty_id`, `registrations.student_id`, `grades.student_id`, `announcements.created_by`.

### 5.2 `students`

Profile and academic fields keyed by **`user_id`** → `users.id`. Includes **`student_id`** (institutional id), GPA, credits, **`profile_completed`**, etc.

### 5.3 `faculty`

Faculty profile keyed by **`user_id`**, unique **`faculty_id`**, `courses_history` JSON text.

### 5.4 `courses` and `sections`

`courses`: catalog. `sections`: offerings per semester, schedule fields, capacity, **`enrolled_count`**, **`faculty_id`** → teaching user.

### 5.5 `registrations`

Student–section–semester rows; **`status`** in (`registered`,`dropped`,`waitlisted`,`cart`). Unique index on `(student_id, section_id, semester)`.

### 5.6 `grades`

Per student per section numeric and letter grades, **`is_final`** flag. Unique `(student_id, section_id)`.

### 5.7 `announcements`

Title/content, **`target_role`**, optional `created_by`.

### 5.8 `registration_settings`

Singleton row (`id = 1`): **`is_open`**, **`semester_label`**, window dates, **`max_credits`**.

### 5.9 Additional application references

Code paths reference **`eform_requests`** for cleanup on user delete. That table is **not** in `schema.sql` as shipped—treat as **integration point** to add via migration if eForms persistence is required.

---

## 6. API endpoints (Express + selected Next routes)

**Legend:** Auth = cookie or bearer JWT unless noted.

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/health` | No | — | Liveness JSON |
| POST | `/auth/login` | No | — | Body: `{ email, password }` → sets cookie, returns `{ user }` |
| POST | `/auth/register` | No | — | Student self-reg → `inactive` |
| POST | `/auth/logout` | No | — | Clears cookie |
| GET | `/auth/me` | Yes | any | Returns `{ user }`, refreshes cookie |
| GET | `/student/overview` | Yes | student | Dashboard payload |
| GET | `/student/sections` | Yes | student | Offered sections for registration |
| GET/POST/DELETE | `/student/cart` | Yes | student | Cart CRUD (aliases `/student/registrations`) |
| POST | `/student/registration/confirm` | Yes | student | Confirm cart → registered |
| GET | `/student/schedule` | Yes | student | Schedule |
| GET | `/student/grades` | Yes | student | Grades + GPA snapshot |
| GET/PUT | `/student/profile` | Yes | student | Profile read/update (+ JWT refresh on PUT) |
| GET | `/faculty/courses` | Yes | faculty | Teaching sections |
| GET | `/faculty/roster/:sectionId` | Yes | faculty | Enrollment list |
| GET/POST | `/faculty/grades/:sectionId` | Yes | faculty | Grade grid read/write |
| GET | `/faculty/overview` | Yes | faculty | Summary |
| GET/PUT | `/faculty/profile` | Yes | faculty | Faculty profile |
| POST | `/admin/import/analyze` | Yes | admin | multipart `file` (+ optional `forced_type`) |
| POST | `/admin/import/execute` | Yes | admin | JSON: `{ type, data, adminPassword }` |
| GET/POST | `/admin/users` | Yes | admin | List / create |
| PATCH | `/admin/users/:id` | Yes | admin | Update user (e.g. status) |
| DELETE | `/admin/users/:id` | Yes | admin | Delete user (transaction) |
| DELETE | `/admin/ai-actions` | Yes | admin | Password-guarded AI delete |
| GET/POST | `/admin/courses` | Yes | admin | Courses |
| PATCH/DELETE | `/admin/courses/:id` | Yes | admin | Update/delete course |
| GET | `/admin/dashboard` | Yes | admin | KPI JSON |
| GET/PUT | `/admin/registration` | Yes | admin | Registration admin view/update |
| GET | `/courses/` | No | — | Public course list |
| GET/POST | `/profile/` | Yes | student | Legacy profile API |
| GET | `/registration-settings` | Yes | any | Current settings |
| PUT | `/registration-settings` | Yes | admin | Update settings |
| GET | `/announcements` | No | — | List announcements |
| POST | `/chat` | Yes | student | AI stream (plain text) |
| POST | `/admin-chat` | Yes | admin | AI stream or structured delete JSON |
| DELETE | `/api/admin/users/[id]` (Next) | Yes (cookie + JWT) | admin | Alternative delete path opening SQLite from Next |

---

## 7. Security implementation (expanded)

- **Passwords:** Never stored in plain text; **bcrypt** with cost factor 10 in seeds and flows.
- **Transport:** Production should terminate TLS at the reverse proxy; cookies marked **`Secure`** when `NODE_ENV === 'production'`.
- **CSRF posture:** Same-site strict cookies reduce cross-site cookie submission; admin destructive actions additionally require **password in JSON body** for AI/import paths.
- **Authorization depth:** Middleware prevents students from hitting `/admin` routes; Express repeats checks—**defense in depth**.
- **AI safety:** Admin system prompt instructs the model not to claim arbitrary DB writes; dangerous delete path is **out-of-band** (structured JSON + dedicated endpoint).
- **Input hygiene:** Delete search strips `%` and `_` from LIKE patterns to reduce wildcard injection surprises.

---

## 8. AI integration details

- **OpenAI client:** instantiated per request with `apiKey`; admin path sets **timeout** and **maxRetries**.
- **Student system prompt (`STUDENT_SYSTEM_BASE`):** domain boundaries (registration only, bilingual, plain text).
- **Admin system prompt (`ADMIN_SYSTEM_BASE`):** use JSON context only; plain paragraphs (no markdown).
- **Import validation:** messages containing **`IMPORT_VALIDATION_REQUEST:`** switch system content to **`IMPORT_VALIDATION_PROMPT`** and strip the marker from the user message so the model returns **strict JSON** (`summary`, `issues`, `ready_rows`).
- **Delete intent:** `extractDeleteQuery` + `findDeleteCandidate` short-circuit before streaming when not an import validation message.
- **Streaming:** `Content-Type: text/plain`; client should read **`res.text()`** or stream reader—not `json()` on success bodies.

Example (simplified) of delete shortcut response shape returned as **plain text**:

```json
{
  "message": "Are you sure you want to delete … Type 'confirm' to proceed.",
  "action": {
    "type": "delete_user",
    "description": "Delete …",
    "endpoint": "/admin/ai-actions",
    "payload": { "target_user_id": "…", "target_user_name": "…" }
  }
}
```

---

## 9. Challenges and solutions (evidence-based)

| Challenge | Solution in codebase |
|-----------|---------------------|
| **Environment variables not loading** when running `npm --prefix backend run dev` from repo root | `server.ts` resolves `workspaceRoot` and loads `.env.local` / `.env` from both root and backend with **`override: true`**. |
| **SQLite foreign key errors on user delete** | Explicit transaction: null `advisor_id`, `sections.faculty_id`, `announcements.created_by`, remove `grades`/`registrations`/eform rows, then `students`/`faculty`/`users`. |
| **CORS + cookies in dev** | Next rewrite to `/__pmu_backend` keeps browser on one origin; **`credentials: 'include'`** on fetches. |
| **AI responses parsed as JSON** | Chat endpoints use **`text/plain`** streaming; frontend assistant uses text body parsing. |
| **OpenAI failures** | Admin handler maps 401/404/429/network errors to **502 JSON** with actionable messages. |
| **Webpack memory in dev** | `next.config.mjs` disables webpack cache in development. |

---

## 10. File structure (annotated)

```
pmu-registration/
├── package.json                 # concurrently dev orchestration
├── FINAL_REPORT.md              # this document
├── frontend/
│   ├── app/                     # Next.js App Router
│   │   ├── login/, register/    # Public auth pages
│   │   ├── student/**           # Student portal pages (dashboard, register, schedule, grades, chatbot, eforms, …)
│   │   ├── faculty/**           # Faculty portal (courses, roster, grades, profile, …)
│   │   ├── admin/**             # Admin portal (users, courses, registration, AI assistant, eforms UI)
│   │   └── api/admin/users/[id]/route.ts  # Next.js DELETE user (SQLite transaction)
│   ├── components/              # Shared UI (Radix-based), layouts, chat widgets
│   ├── lib/                     # Shared logic: jwt, auth, api-base, student-helpers, chat client, …
│   ├── middleware.ts            # Auth + role gates + JWT rotation
│   └── next.config.mjs          # `/__pmu_backend` → Express rewrite
├── backend/
│   ├── server.ts                # Express bootstrap + router mounts
│   ├── server.js                # tsx register → load server.ts
│   ├── routes/                  # auth, students, faculty, admin, courses, profile, settings, chat
│   ├── db/
│   │   ├── database.ts          # open DB, migrate, seed, WAL
│   │   ├── schema.sql           # canonical DDL
│   │   ├── demo-academic.sql    # fallback sections seed
│   │   └── pmu-course-catalog.json
│   ├── data/pmu.db              # SQLite file (generated)
│   └── cookies.ts               # HttpOnly cookie helpers
```

---

## 11. How to run (from scratch)

1. **Prerequisites:** Node.js 20+ (recommended), npm, an OpenAI API key for AI features.
2. **Clone** the repository and enter the project root.
3. **Install dependencies:**
   - `npm install` (root)
   - `npm --prefix frontend install`
   - `npm --prefix backend install`
4. **Environment:** Create **`.env.local`** at the **repository root** (and/or `backend/`) with at least:
   - `OPENAI_API_KEY=...`
   - `JWT_SECRET=...` (use a long random secret in production)
   - Optional: `BACKEND_PORT=5001`, `CLIENT_ORIGIN=http://localhost:3000`
5. **Database:** Starting the backend runs migrations/seeds automatically on first boot (`backend/data/pmu.db`). Optional: `npm run db:migrate` / `npm run db:seed` from root if you use those scripts.
6. **Run:** From root, `npm run dev:all` (or `npm run dev`) to start **Next on 3000** and **Express on 5001**.
7. **Verify:** Open `http://localhost:3000`, log in with seeded accounts from `database.ts` seed (e.g. admin/student/faculty demo passwords in code comments / seed data), or register a new student then activate via admin.

---

## 12. Future enhancements (grounded in codebase gaps)

1. **Implement REST handlers** for `GET/POST /student/eforms`, `GET/PATCH /admin/eforms/:id`, and add a proper **`eform_requests`** migration to match UI and delete cleanup.
2. **Consolidate JWT libraries** (`jose` vs `jsonwebtoken`) and **align Express major versions** between root tooling and packages for reduced confusion.
3. **Enable TypeScript strict mode** in backend and remove `ignoreBuildErrors` in Next for production hardening.
4. **Audit logging** table for admin deletes, imports, and registration setting changes.
5. **Rate limiting** and **bot protection** on `/auth/login` and AI endpoints.
6. **Automated tests** (integration tests for registration edge cases, delete transactions, import analyze/execute).
7. **Email notifications** for inactive → active transitions and eForm decisions.

---

*End of report. This document reflects the repository state at generation time; always verify behavior against the latest code and migrations before submission or deployment.*
