

# 🚀 ProjectHub — AI/ML Project Management App

A premium, Notion + Linear inspired project tracker built for managing your AI/ML portfolio.

---

## Phase 1: Foundation & Auth

### Design System
- Dark mode as default with deep dark background (#0f0f0f) and purple/blue accent colors
- Light mode with clean white background and same accent palette
- Sidebar layout: collapsible left sidebar with navigation (Dashboard, Kanban, List View, Settings)
- Persist theme preference in localStorage

### Authentication (Supabase Auth)
- Email & password signup and login pages
- Protected routes — redirect to login if not authenticated
- Persistent sessions via Supabase's built-in session management
- User profiles table storing display name and email

---

## Phase 2: Dashboard & Summary

### Dashboard Page (Home)
- Summary cards at the top: Total Projects, Completed, In Progress, Overdue
- Overall completion progress ring/bar
- Recent projects list
- Quick-add project button

---

## Phase 3: Projects CRUD & Data Model

### Database Schema (Supabase)
- `profiles` table (id, display_name, email, avatar_url)
- `projects` table (id, user_id, title, description, category/tags, priority, due_date, progress, status, created_at, updated_at)
- `tags` table (id, user_id, name, color) — user-defined color-coded tags
- `project_tags` junction table
- Row Level Security so each user only sees their own data

### Project Features
- Create, Read, Update, Delete projects
- Rich text or textarea for description/notes
- Priority: High (red), Medium (yellow), Low (green) badges
- Status: To Do / In Progress / Done
- Due date picker
- Progress slider (0–100%)
- Custom color-coded tags

---

## Phase 4: Kanban Board View

### Kanban Board (Main View)
- Three columns: To Do | In Progress | Done
- Project cards showing: title, priority badge, due date, progress bar, tags
- Drag and drop cards between columns to update status (using @hello-pangea/dnd)
- Smooth animations on drag
- Click card → opens side panel/modal with full details and inline editing

---

## Phase 5: List View, Search & Filters

### List/Table View
- Toggle between Kanban and List view
- Sortable table with columns: Title, Priority, Status, Due Date, Progress, Tags, Created
- Click row to edit project

### Search & Filter Bar
- Search by title or tag name
- Filter dropdowns: Priority, Status, Tag
- Sort by: Due date, Priority, Progress, Created date

---

## Phase 6: Settings & Polish

### Settings Page
- Change display name
- Change password
- Toggle dark/light mode
- Delete account (with confirmation)

### Final Polish
- Mobile responsive layout (sidebar collapses to hamburger)
- Loading skeletons
- Toast notifications for all actions (create, update, delete)
- Empty states with helpful prompts
- Overdue project highlighting (red indicators for past-due items)

