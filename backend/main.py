"""
FullStack Lab — FastAPI Entry Point
Registers all 3 routers: users, auth, files
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, auth, files

app = FastAPI(
    title="FullStack Lab API",
    description="Task 1: User CRUD | Task 2: JWT Auth | Task 3: File Upload",
    version="1.0.0",
)

# Allow React frontend (localhost:3000) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(files.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "running",
        "docs": "/docs",
        "tasks": {
            "task1_users":  "/users/",
            "task2_auth":   "/auth/login",
            "task3_files":  "/files/upload",
        },
    }
