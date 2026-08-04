from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import fs, db, exec, git
import os

app = FastAPI(
    title="Web IDE & DB Client Backend",
    description="Backend API for File System and Database Client operations.",
    version="1.0.0"
)

# Configure CORS so frontend can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(fs.router, prefix="/api/v1/fs", tags=["File System"])
app.include_router(db.router, prefix="/api/v1/db", tags=["Database Client"])
app.include_router(exec.router, prefix="/api/v1/exec", tags=["Execution & Environment"])
app.include_router(git.router, prefix="/api/v1/git", tags=["Git & GitHub"])

# Ensure static directory exists
os.makedirs("static", exist_ok=True)

# Mount the static directory to serve HTML/CSS/JS
app.mount("/", StaticFiles(directory="static", html=True), name="static")

