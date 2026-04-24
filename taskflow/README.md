# TaskFlow — Multi-Tenant Task Management System

A production-ready, full-stack task management system with **strict multi-tenancy**, **role-based access control (RBAC)**, **JWT authentication**, **Google OAuth**, and a complete **audit trail** — containerized with Docker.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   Frontend   │    │   Backend    │    │ PostgreSQL │  │
│  │ React + Vite │───▶│  Express.js  │───▶│  Database  │  │
│  │    Nginx     │    │  Passport    │    │           │  │
│  │   Port 80    │    │  Port 5000   │    │ Port 5432  │  │
│  └──────────────┘    └──────────────┘    └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, Recharts |
| Backend | Node.js, Express.js, Passport.js |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens), Google OAuth 2.0 |
| Container | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed

### 1. Clone & Configure
```bash
git clone <repo>
cd taskflow

# Copy and edit backend env (optional for Google OAuth)
cp backend/.env.example backend/.env
```

### 2. Start Everything
```bash
docker-compose up --build
```

This automatically:
1. Starts PostgreSQL
2. Runs database migrations
3. Seeds demo data
4. Starts the backend API on port 5000
5. Builds and serves the frontend on port 80

### 3. Open the App
Visit **http://localhost**

### Demo Credentials
| Organization | Email | Password | Role |
|---|---|---|---|
| Acme Corp | admin@acme.com | password123 | Admin |
| Acme Corp | bob@acme.com | password123 | Member |
| Globex Inc | admin@globex.com | password123 | Admin |

> **Tenant isolation demo**: Login as `admin@acme.com` and `admin@globex.com` in separate browsers — each sees only their organization's data.

---

## 🔐 Security Model

### Multi-Tenancy (Tenant Isolation)
- Every database row (tasks, users, audit logs) has an `organization_id` foreign key
- **All queries are scoped to `req.user.organization_id`** — it's impossible to access another org's data
- Cross-tenant assignment validation: assignees must belong to the same organization

### Role-Based Access Control (RBAC)

| Action | Admin | Member |
|--------|-------|--------|
| View all org tasks | ✅ | ❌ (own + assigned only) |
| Create tasks | ✅ | ✅ |
| Update any task | ✅ | ❌ (own only) |
| Delete any task | ✅ | ❌ (own only) |
| Invite/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| View dashboard stats | ✅ | ✅ |

### JWT Authentication
- **Access tokens** — short-lived (7 days), sent as `Authorization: Bearer <token>`
- **Refresh tokens** — long-lived (30 days), stored as SHA-256 hash in DB
- Automatic token rotation on refresh
- Logout invalidates the refresh token

---

## 📡 API Reference

### Authentication
```
POST /api/auth/register    — Create org + admin user
POST /api/auth/login       — Login, get tokens
POST /api/auth/refresh     — Rotate access/refresh tokens
POST /api/auth/logout      — Invalidate refresh token
GET  /api/auth/me          — Get current user
GET  /api/auth/google      — Start Google OAuth
GET  /api/auth/google/callback — OAuth callback
```

### Tasks (all require JWT)
```
GET    /api/tasks           — List tasks (filtered, paginated)
GET    /api/tasks/stats     — Org task statistics
GET    /api/tasks/:id       — Task detail + audit log
POST   /api/tasks           — Create task
PUT    /api/tasks/:id       — Update task
DELETE /api/tasks/:id       — Delete task
```

**Query params for GET /api/tasks:**
- `status` — todo | in_progress | review | done
- `priority` — low | medium | high | urgent
- `search` — full-text search on title/description
- `assigned_to` — filter by assignee UUID
- `page`, `limit` — pagination

### Users/Organization (admin-only routes marked)
```
GET    /api/users           — List org members [admin]
POST   /api/users/invite    — Invite member [admin]
PATCH  /api/users/me        — Update own profile
PATCH  /api/users/:id/role  — Change member role [admin]
DELETE /api/users/:id       — Deactivate member [admin]
GET    /api/users/org       — Get org info
```

---

## 🗄️ Database Schema

```sql
organizations   — id, name, slug, description
users           — id, organization_id, email, name, password_hash, google_id, role, is_active
tasks           — id, organization_id, created_by, assigned_to, title, description, status, priority, due_date, tags
task_audit_logs — id, task_id, organization_id, user_id, action, changes (JSONB)
refresh_tokens  — id, user_id, token_hash, expires_at
```

---

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Set authorized redirect URI: `http://localhost/api/auth/google/callback`
4. Add to `docker-compose.yaml`:
```yaml
GOOGLE_CLIENT_ID: your_client_id
GOOGLE_CLIENT_SECRET: your_client_secret
GOOGLE_CALLBACK_URL: http://localhost/api/auth/google/callback
```

---

## 🛠️ Development (without Docker)

```bash
# Backend
cd backend
cp .env.example .env    # Configure DB credentials
npm install
npm run migrate         # Run migrations
npm run seed            # Seed demo data
npm run dev             # Start with nodemon

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # Starts on http://localhost:3000
```

---

## 📁 Project Structure

```
taskflow/
├── docker-compose.yaml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                    # Express app entry
│       ├── config/
│       │   ├── database.js             # PostgreSQL pool
│       │   └── passport.js             # JWT + Google OAuth strategies
│       ├── controllers/
│       │   ├── auth.controller.js      # Register, login, OAuth
│       │   ├── tasks.controller.js     # Full CRUD + audit logging
│       │   └── users.controller.js     # Member management
│       ├── middleware/
│       │   ├── auth.js                 # authenticate, requireAdmin
│       │   └── validate.js             # express-validator helper
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── tasks.routes.js
│       │   └── users.routes.js
│       └── utils/
│           ├── migrate.js              # DB schema migration
│           └── seed.js                 # Demo data seeder
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    └── src/
        ├── main.jsx                    # App entry + routing
        ├── index.css                   # Tailwind + global styles
        ├── context/
        │   └── AuthContext.jsx         # Auth state + token management
        ├── utils/
        │   └── api.js                  # Axios + auto token refresh
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── DashboardPage.jsx       # Stats + charts
            ├── TasksPage.jsx           # List + CRUD + filters
            ├── TaskDetailPage.jsx      # Detail + audit log
            └── MembersPage.jsx         # Admin: member management
```
