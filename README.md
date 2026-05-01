# FullStack Lab — Complete Project

Task split across the team:
- **Task 1** — User CRUD API (Usha V) → `backend/routers/users.py`
- **Task 2** — JWT Auth (Madhushree NM) → `backend/routers/auth.py`
- **Task 3** — File Upload API (Sahana B S) → `backend/routers/files.py`
- **Task 4** — React Frontend (Bharath K) → `frontend/src/App.tsx`

---

## Quick Start

### 1 — Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server (port 8000)
uvicorn main:app --reload
```

API docs available at: http://localhost:8000/docs

---

### 2 — Frontend (React + Vite + TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev
```

Open: http://localhost:3000

---

## Credentials

| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin123  | admin |
| user     | user123   | user  |

---

## API Endpoints

### Auth — `/auth`
| Method | Path             | Description                    |
|--------|------------------|--------------------------------|
| POST   | /auth/login      | Login → returns JWT token      |
| GET    | /auth/me         | Protected: returns profile     |
| GET    | /auth/admin-only | Admin-only protected route     |

### Users — `/users`
| Method | Path            | Description            |
|--------|-----------------|------------------------|
| GET    | /users/         | List all users         |
| GET    | /users/{id}     | Get user by ID         |
| POST   | /users/         | Create user            |
| PUT    | /users/{id}     | Update user            |
| DELETE | /users/{id}     | Delete user            |

### Files — `/files`
| Method | Path                    | Description            |
|--------|-------------------------|------------------------|
| POST   | /files/upload           | Upload file            |
| GET    | /files/                 | List all files         |
| GET    | /files/{id}             | Get file metadata      |
| GET    | /files/{id}/download    | Download file          |
| DELETE | /files/{id}             | Delete file            |

---

## Frontend Features

- **Login page** — JWT auth using OAuth2 password flow
- **Users tab** — table with live loading/error states, add user form, delete
- **Files tab** — drag-and-drop upload zone, file list with download & delete
- **Profile tab** — decoded JWT payload viewer + live `/auth/me` response
- Toast notifications for all actions
- Persistent auth via localStorage

---

## Project Structure

```
fullstack-lab/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── requirements.txt
│   └── routers/
│       ├── auth.py              # Task 2 — JWT auth
│       ├── users.py             # Task 1 — User CRUD
│       └── files.py             # Task 3 — File upload
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx             # React entry point
        └── App.tsx              # Task 4 — Full single-file React app
```
