# ProjectHub — Frontend Tracker

_Last updated: 2026-03-04_

---

## 1. Architecture Overview

**Core Stack:** React 18, Vite 5, TypeScript, Tailwind CSS (ShadCN UI), Lucide Icons, TanStack Query, React Router v6

The frontend is a pure React SPA built with Vite. It talks to the Node/Express backend via REST API only. All authentication is JWT-based, stored in `localStorage`.

### Folder Structure
```
src/
├── components/         Reusable UI (ProjectCard, AppSidebar, Kanban components, kibo-ui/)
├── pages/              Route-level views (Dashboard, Login, Signup, Settings, ProjectDetail, …)
├── lib/
│   ├── api.ts          Centralized REST client — all API calls go here
│   └── utils.ts        cn() and misc helpers
├── hooks/
│   └── useProjects.ts  TanStack Query hook for project CRUD + stats
├── contexts/
│   ├── AuthContext.tsx  JWT auth, profile update, delete account
│   └── ThemeContext.tsx Dark/light theme with localStorage persistence
└── App.tsx             Router + protected/public route guards
```

---

## 2. API Client (`src/lib/api.ts`)

All HTTP calls go here. Pattern: `apiFetch<T>(path, options)` returns `{ data, error }`.
- Auto-attaches `Authorization: Bearer <token>` from localStorage.
- Handles HTTP errors and returns `{ data: null, error: message }` — no uncaught throws.
- Dev: Vite proxies `/api` → `http://localhost:3001`. Prod: `VITE_API_URL` env var.

### Exported Functions

| Function | Purpose |
|---|---|
| `apiGetProjects / apiCreateProject / apiUpdateProject / apiDeleteProject` | Own project CRUD |
| `apiSeedProjects` | Bulk seed 20+ demo projects |
| `apiGetTasks / apiCreateTask / apiUpdateTask / apiDeleteTask` | Task CRUD per project |
| `apiCreateSubItem / apiUpdateSubItem / apiDeleteSubItem` | Sub-items (bullet points) inside tasks |
| `apiGetProjectMembers / apiInviteMember / apiUpdateMemberRole / apiRemoveMember` | Team collaboration — invite by email |
| `apiGetComments / apiCreateComment / apiUpdateComment / apiDeleteComment` | Project/task comments |
| `apiGetActivityGraph` | 365-day contribution graph data |
| `apiGetBadges` | Earned achievement badges |
| `apiGetCustomStatuses / apiCreateCustomStatus / apiUpdateCustomStatus / apiDeleteCustomStatus` | User-defined status labels |
| `apiGetSharedProjects` | Projects where current user is a collaborator |
| `apiChangePassword / apiSendPasswordReset / apiResetPassword` | Password management |

---

## 3. Pages & Routes

| Page | Route | Description | What was Built / Why |
|---|---|---|---|
| **Login** | `/login` | Email + password sign-in | Progressive "Forgot Password?" link appears after 2 failed attempts (security UX) |
| **Signup** | `/signup` | 3-step: Email → OTP → Profile | User asked for email verification at sign-up |
| **Forgot Password** | `/forgot-password` | Send reset OTP → enter new password | User wanted password reset from both sign-in page and settings |
| **Dashboard** | `/` | Stat cards, progress bar, contribution graph, achievement badges, recent projects | User wanted to track overall progress visually — added kibo-ui-inspired contribution graph and badge system |
| **Kanban Board** | `/kanban` | 3-column drag-and-drop (Planned/In Progress/Done) with optimistic updates | User loved the kibo-ui kanban aesthetic — whole card is draggable, cards snap instantly on drag (optimistic state) with background DB sync |
| **List View** | `/list` | Paginated table of all projects with search, filters, edit/delete | User wanted a list alternative to kanban |
| **Project Detail** | `/projects/:id` | Full project page: header, task list (simple & complex task types), sub-items, share panel, comments | Core feature request: "I want to add tasks, sub-plans with bullet points, and track progress inside each project" |
| **Collaborations** | `/collaborations` | All projects where user is a member (editor/viewer), with filter by status/role | User invited a second account and expected to see shared projects — built dedicated page |
| **Settings** | `/settings` | Profile update, password change (with current password validation + OTP option), theme toggle, custom statuses CRUD, danger zone (delete account) | User reported missing OTP validation and no forgot password link in settings |
| **Not Found** | `*` | 404 fallback | — |

---

## 4. Key Components

### `AppSidebar.tsx`
- Collapsible sidebar with tooltip support when collapsed.
- Nav items: Dashboard, Kanban Board, List View, **Collaborations** (new), Settings.
- User avatar popup: theme toggle + sign out (positioned absolutely via createPortal to avoid scroll clipping).

### `ProjectCard.tsx`
- Shown in Dashboard grid and Kanban board.
- Entire card is clickable → navigates to `/projects/:id`.
- Dropdown menu (edit/delete) uses `stopPropagation` to prevent card click.

### `kibo-ui/kanban.tsx` (custom, no npm package)
- Built from kibo-ui source code (user provided code, requested no library install).
- `KanbanBoard`, `KanbanCard`, `KanbanCards`, `KanbanHeader`, `KanbanProvider`.

### `kibo-ui/contribution-graph.tsx` (custom, no npm package)
- 52-week activity heatmap grid (like GitHub's contribution chart).
- Built from scratch matching kibo-ui API.

---

## 5. Task System (ProjectDetail)

**User requirement:** "I want to add tasks like Notion — just write the task, add sub-bullets if I want, set priority and due date optionally."

### Task Types
- **Simple task:** Single content block. Priority, optional date/time.
- **Complex task (+ Sub-items):** Content block + expandable sub-item list. Each sub-item has its own content, priority, optional date/time, and done checkbox.

### UX Decisions
- No mandatory title — task content IS the task (user explicitly asked for this).
- Date/time hidden by default — shown by clicking "Add date & time" (progressive disclosure).
- Priority defaults to Medium. Status defaults to todo.
- Sub-items use drag & drop for reorder (within the task card).
- Completed tasks shown in a collapsible "Completed (N)" section to reduce visual noise.

---

## 6. Collaboration System

**User requirement:** "I add a second account as collaborator — that user must be able to see shared projects."

- Owner invites by email with role (Editor/Viewer) from Share panel in ProjectDetail.
- Invited user sees all shared projects in `/collaborations` page.
- Clicking a shared project navigates to the full ProjectDetail (tasks, comments, etc.).
- ProjectDetail falls back to `apiGetSharedProjects` if project not found in own projects list.

---

## 7. Security & Auth

- JWT stored in localStorage (`projecthub_token`).
- All API calls send `Authorization: Bearer <token>`.
- Password change requires current password.
- Forgot Password: OTP emailed → reset form (from both login page and settings).
- Account deletion requires email confirmation text entry.

---

## 8. Environment Variables

| Variable | Dev Value | Prod Value | Purpose |
|---|---|---|---|
| `VITE_API_URL` | *(empty, Vite proxies /api)* | `https://api.yourdomain.com` | Backend API base URL |

---

## 9. Current Status

| Feature | Status | Notes |
|---|---|---|
| Auth (login, signup, OTP, forgot pw) | ✅ Complete | |
| Password change + validation | ✅ Complete | Requires current password, checks match |
| Dashboard stats + activity graph | ✅ Complete | Contribution graph + badges |
| Kanban board (drag & drop) | ✅ Complete | Full-card DnD, optimistic updates |
| List view (table, filters, search) | ✅ Complete | |
| Project detail page | ✅ Complete | Tasks, sub-items, share, comments |
| Task CRUD (simple + complex) | ✅ Complete | No mandatory title, optional date/time |
| Sub-items (bullet points per task) | ✅ Complete | |
| Share & Collaborators panel | ✅ Complete | Invite by email, role assignment |
| Comments (project-level) | ✅ Complete | Tested and working |
| Collaborations page | ✅ Complete | Shows projects shared with user |
| Custom statuses (Settings) | ✅ Complete | Color picker + label |
| Badges / achievements | ✅ Complete | Dashboard achievements section |
| Sidebar navigation | ✅ Complete | Includes Collaborations link |

### Known Issues After 2026-03-04 Session
- Custom Statuses are not yet wired into projectstatus filter in ListView (backend built, frontend Settings built, List View filter not yet connected)
