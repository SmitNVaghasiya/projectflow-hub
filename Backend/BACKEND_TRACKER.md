# ProjectHub — Backend Tracker

_Last Updated 04/03/2026_
_Last updated: 22/03/2026_

---

## 1. Architecture Overview

**Core Stack:** Node.js (ESM), Express, PostgreSQL (Neon), Zod, bcrypt, JWT, Nodemailer

The backend is a standalone Express API server completely decoupled from the frontend.

### Folder Structure
```
Backend/
├── routes/
│   ├── auth.js           Auth (login, signup, OTP, forgot password, profile, delete account)
│   ├── projects.js       Project CRUD (owner-only)
│   ├── tasks.js          Tasks + Sub-items + Activity graph + Badges + Shared projects
│   ├── collaboration.js  Team members (invite, roles) + Comments
│   └── statuses.js       Custom user-defined status labels
├── middleware/
│   ├── auth.js           JWT verify + revocation check
│   ├── rateLimiter.js    Global, project, and task rate limits
│   └── errorHandler.js   Centralized error logging
├── scripts/
│   ├── migrate.js        Standalone PostgreSQL initialization + migrations
│   └── seed.js           Seed script
├── db.js                 Neon PG pool (initDb extracted to scripts/)
├── app.js                Express setup + route registration
└── index.js              Server entry point (port listener)
```

### Design Principles
- **Zod validation** on every request body — no bad data reaches the DB.
- **ALTER TABLE IF NOT EXISTS** pattern for all schema evolution (never drops data).
- **Ownership checks** on every mutating route (owner vs member roles enforced).
- JWT blacklist (`revoked_tokens` table) for safe logout.

---

## 2. API Routes

### Auth (`/api/auth`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/send-otp` | No | Send 6-digit OTP to email for signup or password reset |
| POST | `/verify-otp` | No | Verify OTP (used for signup) |
| POST | `/signup` | No | Create account (email verified via OTP) |
| POST | `/login` | No | Authenticate user, return JWT |
| POST | `/logout` | Yes | Blacklist JWT (revoked_tokens) |
| GET | `/me` | Yes | Get current user profile |
| PUT | `/me` | Yes | Update display name |
| DELETE | `/me` | Yes | Delete account + cascade all data |
| POST | `/forgot-password` | No | Send password reset OTP |
| POST | `/reset-password` | No | Verify reset OTP + set new password |
| PUT | `/change-password` | Yes | Change password (requires current password) |

### Projects (`/api/projects`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List all user's own projects |
| POST | `/` | Yes | Create project |
| POST | `/seed` | Yes | Bulk seed (transactional) |
| PUT | `/:id` | Yes | Update project (owner only) |
| DELETE | `/:id` | Yes | Delete project (owner only) |

### Tasks & Sub-items (`/api/projects/:id/tasks`, `/api/task/:id`, `/api/sub-item/:id`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/projects/:projectId/tasks` | Yes | List tasks (owner OR member access) |
| POST | `/projects/:projectId/tasks` | Yes | Create task (owner only) |
| PUT | `/task/:taskId` | Yes | Update task (owner only) |
| DELETE | `/task/:taskId` | Yes | Delete task (owner only) |
| PATCH | `/projects/:projectId/tasks/reorder` | Yes | Batch reorder tasks |
| POST | `/task/:taskId/sub-items` | Yes | Add sub-item to task |
| PUT | `/sub-item/:subId` | Yes | Update sub-item (content, priority, date, is_done) |
| DELETE | `/sub-item/:subId` | Yes | Delete sub-item |

### Activity & Badges (`/api/activity/*`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/activity/graph` | Yes | 365-day activity log counts (contribution graph data) |
| GET | `/activity/badges` | Yes | All earned badges for user |

### Shared Projects (`/api/shared-projects`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/shared-projects` | Yes | Projects where current user is a collaborator (editor/viewer) |

### Collaboration — Members (`/api/projects/:id/members`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/:projectId/members` | Yes | List members (owner or member can view) |
| POST | `/:projectId/members` | Yes | Invite by email with role (owner only) |
| PUT | `/:projectId/members/:memberId` | Yes | Update role (owner only) |
| DELETE | `/:projectId/members/:memberId` | Yes | Remove member (owner only) |

### Comments (`/api/projects/:id/comments`, `/api/comment/:id`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/:projectId/comments` | Yes | List project or task comments |
| POST | `/:projectId/comments` | Yes | Post a comment (editors/owners only, not pure viewers) |
| PUT | `/comment/:commentId` | Yes | Edit own comment |
| DELETE | `/comment/:commentId` | Yes | Delete own comment |

### Custom Statuses (`/api/statuses`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List user's custom status labels |
| POST | `/` | Yes | Create status label (name + hex color) |
| PUT | `/:id` | Yes | Update name, color, or sort_order |
| DELETE | `/:id` | Yes | Delete status label |

---

## 3. Database Schema (Neon PostgreSQL)

All tables auto-created and evolved on startup in `db.js` using `CREATE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` + `.catch(() => {})` for safe idempotent migrations.

### `users`
- `id` TEXT PK (UUID), `email` TEXT UNIQUE, `password_hash` TEXT, `display_name` TEXT
- `email_verified` BOOLEAN (required for login), `created_at` TIMESTAMPTZ

### `projects`
- `id` TEXT PK, `user_id` FK→users, `name`, `description`, `status` (todo/in_progress/done)
- `priority` (low/medium/high), `due_date` TEXT, `created_at`, `updated_at`

### `tasks`
- `id` TEXT PK, `project_id` FK→projects, `user_id` FK→users
- `content` TEXT (no title — user requested title-free tasks)
- `task_type` TEXT ('simple'/'complex'), `status`, `priority`
- `due_date` TEXT, `due_time` TEXT, `sort_order` INT, `created_at`, `updated_at`
- **Migration fix:** Old DB had `title NOT NULL`. Added `ALTER COLUMN title DROP NOT NULL` on startup so content-only inserts work.

### `task_sub_items`
- `id` TEXT PK, `task_id` FK→tasks
- `content` TEXT, `priority`, `due_date`, `due_time`, `is_done` BOOLEAN, `sort_order`, `created_at`

### `project_members`
- `id` TEXT PK, `project_id` FK→projects, `user_id` FK→users
- `role` TEXT ('editor'/'viewer'), `invited_by` FK→users, `joined_at` TIMESTAMPTZ
- UNIQUE (project_id, user_id) — upsert on re-invite

### `comments`
- `id` TEXT PK, `project_id` FK→projects, `task_id` FK→tasks (nullable)
- `user_id` FK→users, `content` TEXT, `created_at`, `updated_at`

### `custom_statuses`
- `id` TEXT PK, `user_id` FK→users
- `name` TEXT, `color` TEXT (hex), `sort_order` INT, `created_at`

### `activity_log`
- `id` TEXT PK, `user_id` FK→users, `action_type` TEXT
- `project_id`, `task_id` (nullable FKs), `created_at`

### `badges` (static seed)
- `id` TEXT PK, `name`, `description`, `icon`, `trigger_type`
- Seeded with 12 badges: First Launch, First Win, Milestone 5/10, Speed Run, Deep Planner, Full Sweep, Consistent, Streak Master, Early Bird, All-Rounder, On Time

### `user_badges`
- `id` TEXT PK, `user_id`, `badge_id` FK→badges, `project_id`, `earned_at`
- UNIQUE (user_id, badge_id) — no duplicate awards

### `otp_codes`
- `id`, `email`, `code` (6-digit), `expires_at`, `used` BOOLEAN, `created_at`

### `revoked_tokens`
- `jti` TEXT PK, `revoked_at` TIMESTAMPTZ

---

## 4. Security & Design Decisions

1. **JWT Blacklist:** Every token has a `jti` UUID. Logout stores it in `revoked_tokens`. Auth middleware rejects blacklisted tokens.
2. **Bcrypt cost 12:** Slower than default (10) to resist offline brute force.
3. **OTP replay prevention:** `used` boolean in `otp_codes` — cannot replay captured OTPs.
4. **Rate limiting tiers**: Global 100 req/15 min, Auth 10 req/15 min.
5. **Generous Creation Quotas**: Instead of hard API blocking, users have generous limits (50 projects/day, 500 tasks/project/day, 3000 tasks/global/day). Exceeding these logs a warning for admins.
6. **Task Pagination**: `GET /api/projects/:projectId/tasks` implements chunked loading (offset/limit) to handle thousands of items gracefully without freezing the UI.
7. **Title NOT NULL fix**: Old tasks table had title as NOT NULL. `scripts/migrate.js` now runs `ALTER COLUMN title DROP NOT NULL` on startup.
8. **Member access for tasks**: `GET /:projectId/tasks` and `GET /api/projects/:id` now allow both owner and `project_members` access.
9. **Test Environment Bypass**: All rate limiters include `skip: () => process.env.NODE_ENV === "test"` — a permanent, industry-standard pattern ensuring limiters run in production but are bypassed during automated tests.

---

## 5. Current Status

| Feature | Status | Notes |
|---|---|---|
| Auth (login, signup, OTP) | ✅ Complete | |
| Forgot password + reset | ✅ Complete | OTP-based flow |
| Change password (in settings) | ✅ Complete | Requires current password |
| Project CRUD | ✅ Complete | Owner-only |
| Task CRUD (title-free, content-based) | ✅ Complete | |
| Sub-items CRUD | ✅ Complete | |
| Task reorder | ✅ Complete | PATCH batch reorder |
| Activity log + contribution graph | ✅ Complete | |
| Badges (12 types) | ✅ Complete | Auto-awarded on trigger |
| Team members (invite, roles) | ✅ Complete | Email-based invite |
| Comments (project + task level) | ✅ Complete | |
| Shared projects list | ✅ Complete | |
| Custom status labels | ✅ Complete | |
| DB migration safety | ✅ Complete | Idempotent ALTERs + .catch |
| Database schema extracted from boot | ✅ Complete | Moved `initDb` logic from `db.js` to `scripts/migrate.js` |
| Pagination for GET Tasks       | ✅ Complete | Implemented `limit` and `offset` support for chunked rendering |
| User Rate Limiting (Projects)  | ✅ Complete | Generous 50 quota / day (alerts logged to console) |
| User Rate Limiting (Tasks)     | ✅ Complete | Dual-layer: 500/project/day AND 3000/global/day |
| Comment Deletion Authorization | ✅ Complete | IDOR fixed; owners can now delete comments on their project |
| 53/53 Automated Tests Passing  | ✅ Complete | `npm run test` — auth, projects, and DB tests all green |
| Rate Limiters Skip in Test Mode | ✅ Complete | `skip: () => NODE_ENV === "test"` — permanent, industry-standard pattern |
