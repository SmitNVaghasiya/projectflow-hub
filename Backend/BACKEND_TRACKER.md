# ProjectHub — Backend Tracker

## 1. Architecture Overview

**Core Stack:** Node.js, Express, PostgreSQL (Neon), Zod (Validation), Jest (Testing)

The backend was completely decoupled from the frontend to ensure a clean separation of concerns, improved scalability, and better security.
- **Why Express over Serverless Functions?** Keeps connection pooling under control (Neon DB handles 10 max connections in the pool efficiently), prevents cold starts, and centralizes middleware (rate limiting, authentication, error handling).
- **Why Zod?** Guarantees that no bad data ever reaches the database layer. Every route has a schema.
- **Why explicit Ownership Checks?** Filtering `WHERE user_id = $1` isn't enough for PUT/DELETE — returning 404 vs 403 matters for security audits. We explicitly check ownership to return 403 Forbidden.

### Folder Structure
- `config/` - Env validation (handled directly in db.js currently)
- `middleware/` - `auth.js` (JWT & blacklisting), `rateLimiter.js` (DoS protection), `errorHandler.js` (Global catch)
- `routes/` - `auth.js` (Login/Signup/OTP), `projects.js` (Project CRUD)
- `tests/` - Jest suite covering auth, projects, and db structure.
- `app.js` - Express configuration (routes, middleware) without port listening (for tests).
- `index.js` - Server entry point (starts listening).
- `db.js` - DB initialization, connection pooling, and table creation.

---

## 2. API Routes

### Authentication (`/api/auth`)

| Method | Route | Auth Needed | Description | Request Body | Response |
|---|---|---|---|---|---|
| POST | `/send-otp` | No | Generates & emails 6-digit OTP | `{ email }` | `{ message }` |
| POST | `/verify-otp` | No | Validates OTP, generates JWT | `{ email, code }` | `{ verified, token, user }` |
| POST | `/signup` | No | Creates account (needs valid OTP) | `{ email, password, display_name, code }` | `{ token, user }` |
| POST | `/login` | No | Authenticates user | `{ email, password }` | `{ token, user }` |
| POST | `/logout` | Yes | Blacklists current JWT | None | `{ message }` |
| GET | `/me` | Yes | Gets full profile | None | `{ id, email, display_name, created_at }` |
| PUT | `/me` | Yes | Updates profile | `{ display_name }` | Updated profile |
| DELETE | `/me` | Yes | Wipes account and data | None | `{ message }` |

### Projects (`/api/projects`)

| Method | Route | Auth Needed | Description | Request Body | Response |
|---|---|---|---|---|---|
| GET | `/` | Yes | List all user's projects | None | Array of projects |
| GET | `/:id` | Yes | Get a single project | None | Project object |
| POST | `/` | Yes | Create new project | `{ name, description, priority, status, due_date }` | Created project |
| POST | `/seed` | Yes | Bulk create (transactional) | `{ projects: [...] }` | `{ count }` |
| PUT | `/:id` | Yes | Update project details | Any project fields | Updated project |
| DELETE | `/:id` | Yes | Delete a project | None | `{ message }` |

---

## 3. Database Schema (Neon PostgreSQL)

We use PostgreSQL hosted on Neon. Tables are auto-created on startup in `db.js`.

### `users`
- `id` (TEXT, PK): UUIDv4
- `email` (TEXT, UNIQUE): Lowercase emails
- `password_hash` (TEXT): Bcrypt cost 12
- `display_name` (TEXT)
- `email_verified` (BOOLEAN): Defaults FALSE. Required for login.
- `created_at` (TIMESTAMPTZ)

### `projects`
- `id` (TEXT, PK): UUIDv4
- `user_id` (TEXT, FK → users.id): Cascades on delete.
- `name` (TEXT)
- `description` (TEXT)
- `status` (TEXT): ENUM ('todo', 'in_progress', 'done')
- `priority` (TEXT): ENUM ('low', 'medium', 'high')
- `due_date` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `tasks`
- `id` (TEXT, PK): UUIDv4
- `project_id` (TEXT, FK → projects.id): Cascades on delete.
- `title` (TEXT)
- `status` (TEXT): ENUM ('todo', 'in_progress', 'done')
- `created_at` (TIMESTAMPTZ)

### `otp_codes`
Stores temporary verification codes.
- `id` (TEXT, PK)
- `email` (TEXT): Indexed for fast lookup
- `code` (TEXT): 6 digits
- `expires_at` (TIMESTAMPTZ)
- `used` (BOOLEAN): Prevents replay attacks
- `created_at` (TIMESTAMPTZ)

### `revoked_tokens`
Stores the `jti` (JWT ID) of logged-out tokens to act as a blacklist.
- `jti` (TEXT, PK)
- `revoked_at` (TIMESTAMPTZ)

---

## 4. Security & Design Decisions

1. **JWT vs Sessions:** Chose JWT for stateless scalability. However, pure stateless JWTs cannot be logged out securely. So we embedded a `jti` (UUID) into every token, and we store that `jti` in a `revoked_tokens` table on logout. The `auth` middleware checks this table on every request.
2. **Bcrypt Cost 12:** Standard Node apps use 10. We use 12 to drastically slow down offline brute force attacks, while keeping login times acceptable (< 500ms).
3. **OTP Replay Attacks:** The `otp_codes` table tracks a `used` boolean flag. If an attacker intercepts the verify-otp request, they cannot replay it later because the DB will reject `used=TRUE`.
4. **Rate Limiting Tiers:**
   - Global: 100 req / 15m (Stop generic scraping/DDoS)
   - Auth Routes: 10 req / 15m (Stop password guessing)
   - OTP System: 3 requests / 10m (Stop email spam and cost spikes for SMTP)

---

## 5. Status & Backlog

### Current Status
- **Authentication:** ✅ Complete (Includes Rate limits, Zod, JWT Blacklist)
- **Projects CRUD:** ✅ Complete (Includes ownership validation)
- **Database:** ✅ Complete (Pool optimized for Neon DB)
- **Test Suite:** ✅ Complete (Auth, Projects, DB layers)

### Backlog (Do Not Implement Yet)
- [ ] Tasks CRUD routes
- [ ] Sub-task management (Notion style)
- [ ] SAM AI Agent integration
- [ ] Project Sharing (read-only links)
