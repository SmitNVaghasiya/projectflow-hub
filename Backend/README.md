# ProjectHub Backend

This is the backend for the ProjectHub system, designed as a standalone Express REST API powered by PostgreSQL (Neon).

## 🚀 Overview

The backend is built with performance, security, and a specific user scale in mind:
- **Target Audience**: Built primarily for personal and small-team use (target: 50–200 users max).
- **Core Architecture**: Node.js, Express, PostgreSQL (Neon DB).
- **Security**: Robust JWT authentication, Bcrypt password hashing, and specific rate limiting.
- **Data Integrity**: Zod schema validation on every request.

## 🛠 Setup & Installation

**1. Install Dependencies**
\`\`\`bash
npm install
\`\`\`

**2. Environment Variables (`.env`)**
We have provided an `.env.example` file that contains all the necessary environment variables and instructions on how to generate them. 

Simply copy it to create your local `.env` file:
```bash
cp .env.example .env
```
Then, open the new `.env` file and fill in your actual credentials (Neon DB URL, Gmail App Password, JWT Secret, etc.).

**3. Database Initialization / Migration**
The database is structured using PostgreSQL. To initialize all tables and seed the static data (like Badges), run:
\`\`\`bash
npm run db:migrate
\`\`\`
*(Note: You do NOT need to do this manually on every boot. The migration script uses `CREATE TABLE IF NOT EXISTS` and is totally idempotent).*

**4. Start the Server**
\`\`\`bash
npm run dev
\`\`\`

## 🧠 Architectural Philosophy & Constraints

Based on our planning, this backend intentionally avoids aggressive enterprise-level limitations in favor of a frictionless personal/small-team experience:

1. **Generous Creation Quotas**: Instead of strict global limits that might interrupt flow, the system employs generous daily quotas via `express-rate-limit`:
   - Projects: 50 per day (per user).
   - Tasks: 500 per day (per project), combined with a global 3000 tasks/day (per user).
2. **Chunked Pagination Strategy**: Rather than hard-blocking the Kanban board to 50 items total, endpoints like `GET /api/projects/:projectId/tasks` support chunked loading (fetching 50-100 tasks at a time) via `limit` and `offset` parameters.
3. **Collaboration Focus**: Security checks strictly delineate between a "Project Owner" (who can delete/manage the project) and a "Collaborator" (who can view, edit tasks, and comment).
4. **Resilient Migrations**: Database initialization logic was extracted out of the runtime `index.js/db.js` boot sequence into a dedicated `scripts/migrate.js` to prevent performance overhead on application restarts.

## 📂 Key Features
* Email OTP Verification for Signups and Password Resets
* Notion-like Task Tracking (Tasks + Sub-Items)
* Gamification (Activity logging, Streaks, Achievements/Badges)
* Granular Team Member Permissions
* Custom Project Statuses
* Global Error Handling and CSRF awareness.
