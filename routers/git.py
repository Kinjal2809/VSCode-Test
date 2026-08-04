import os
import subprocess
from fastapi import APIRouter, HTTPException
from schemas import GitCommandRequest, GitCloneRequest

router = APIRouter()

@router.get("/status")
async def git_status(cwd: str = "."):
    """Get the current git status for a specific directory."""
    try:
        # Check if it's a git repo
        is_repo = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=cwd,
            capture_output=True,
            text=True
        )
        if is_repo.returncode != 0:
            return {"status": "success", "is_git_repo": False}

        # Get status
        result = subprocess.run(
            ["git", "status", "-s"],
            cwd=cwd,
            capture_output=True,
            text=True
        )
        
        # Get current branch
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=cwd,
            capture_output=True,
            text=True
        )

        return {
            "status": "success",
            "is_git_repo": True,
            "git_status": result.stdout.strip(),
            "branch": branch.stdout.strip()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/command")
async def run_git_command(request: GitCommandRequest):
    """Run a specific git command (add, commit, push, pull)."""
    try:
        # Simple security validation
        cmd = request.command.strip()
        if not cmd.startswith("git "):
            raise HTTPException(status_code=400, detail="Only git commands allowed")

        result = subprocess.run(
            cmd,
            cwd=request.cwd,
            shell=True,
            capture_output=True,
            text=True
        )
        
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clone")
async def clone_repo(request: GitCloneRequest):
    """Clone a github repo into the target directory."""
    try:
        result = subprocess.run(
            ["git", "clone", request.repo_url],
            cwd=request.target_dir,
            capture_output=True,
            text=True
        )
        
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
