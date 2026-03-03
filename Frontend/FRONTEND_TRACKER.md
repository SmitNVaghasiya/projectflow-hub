# ProjectHub — Frontend Tracker

## 1. Architecture Overview

**Core Stack:** React, Vite, TypeScript, Tailwind CSS, Lucide Icons

The frontend is a pure React SPA (Single Page Application) built with Vite for blazing fast HMR (Hot Module Replacement) and optimized production builds. It is completely decoupled from the backend and communicates strictly via REST API.

### Folder Structure
- `src/`
  - `components/` - Reusable UI elements (buttons, inputs, modals, cards)
  - `pages/` - Top-level route components (Dashboard, Login, Signup, ProjectView)
  - `lib/` - Utilities and API client (`api.ts`)
  - `hooks/` - Custom React hooks (e.g., `useAuth`)
  - `assets/` - Static files (images, fonts)
- `vite.config.ts` - Vite configuration, including the local dev proxy (`/api` → `http://localhost:3001`)

---

## 2. API Client & State Management

All network requests are centralized in `src/lib/api.ts`.
- It automatically attaches the `Bearer` token from localStorage to every request.
- It parses JSON responses and standardizes error throwing so components can simply `try/catch`.
- In development, `VITE_API_URL` is empty, pushing requests to `/api` which Vite proxies to `localhost:3001`. In production, it points to the deployed API URL.

State management currently relies on React Context (`AuthContext` for user state) and local component state for UI interactions. 

---

## 3. Pages & Components

| Page | Route | Description | API Calls |
|---|---|---|---|
| **Login** | `/login` | Standard email/password login form | `POST /auth/login` |
| **Signup** | `/signup` | 3-step flow: Email → Verification Code (OTP) → Profile/Password | `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/signup` |
| **Dashboard** | `/` | Protected. Shows list of user's projects | `GET /projects`, `GET /auth/me` |
| **Project View** | `/project/:id` | Protected. Board/List view for a specific project | `GET /projects/:id` (Tasks API pending) |

---

## 4. Environment Variables

| Variable | Dev Value | Prod Value | Purpose |
|---|---|---|---|
| `VITE_API_URL` | *(empty)* | `https://api.yourdomain.com` | Base URL for the backend REST API |

*(Note: There are no Supabase keys here anymore, as the entire stack was migrated to a custom Node/Express backend.)*

---

## 5. Status & Backlog

### Current Status
- **Authentication Flow:** ✅ Complete (Login, Signup with OTP flow, Logout)
- **API Wiring:** ✅ Complete (Proxy configured, interceptors ready)
- **Project List UI:** 🚧 In Progress (Fetching from backend works, UI needs polish)
- **Styling:** ✅ Complete (Tailwind)

### Known Issues
- Form errors currently display as generic red text; needs better toast notifications.

### Backlog (Do Not Implement Yet)
- [ ] Tasks Drag and Drop UI (Kanban board)
- [ ] Notion-like subtask editor
- [ ] AI Q&A Chat interface
- [ ] Mobile PWA Manifest & Service Worker
- [ ] Achievement Badges UI components
