import os
import subprocess
import json
import pty
import fcntl
import asyncio
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from schemas import RunRequest, InstallRequest, CommandRunRequest

router = APIRouter()

# Path to the virtual environment python and pip
VENV_PYTHON = os.path.join("venv", "bin", "python")
VENV_PIP = os.path.join("venv", "bin", "pip")

@router.post("/run")
async def run_code(request: RunRequest):
    """Execute a python script synchronously and return output."""
    try:
        if not os.path.exists(request.path) or not os.path.isfile(request.path):
            raise HTTPException(status_code=404, detail="File not found")
            
        if not request.path.endswith('.py'):
            raise HTTPException(status_code=400, detail="Can only execute .py files")

        result = subprocess.run(
            [VENV_PYTHON, request.path],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        return {
            "status": "success",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Execution timed out (10s limit).")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run_command")
async def run_command(request: CommandRunRequest):
    """Execute an arbitrary shell command (Run Configurations)."""
    try:
        env = os.environ.copy()
        env.update(request.env)
        
        # Add venv to path
        venv_bin = os.path.abspath(os.path.join("venv", "bin"))
        env["PATH"] = f"{venv_bin}:{env.get('PATH', '')}"
        
        result = subprocess.run(
            request.command,
            cwd=request.cwd,
            env=env,
            shell=True,
            capture_output=True,
            text=True,
            timeout=15
        )
        
        return {
            "status": "success",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Execution timed out (15s limit).")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/info")
async def get_env_info():
    """Get Python environment information."""
    try:
        result = subprocess.run(
            [VENV_PYTHON, "--version"],
            capture_output=True,
            text=True
        )
        return {"status": "success", "python_version": result.stdout.strip() or result.stderr.strip()}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("/libraries")
async def get_libraries():
    """Get list of installed pip packages."""
    try:
        result = subprocess.run(
            [VENV_PIP, "list", "--format=json"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Failed to list packages")
            
        packages = json.loads(result.stdout)
        return {"status": "success", "packages": packages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/install")
async def install_package(request: InstallRequest):
    """Install a new pip package."""
    try:
        pkg = request.package_name.strip()
        if not pkg or ';' in pkg or '&' in pkg or '|' in pkg:
            raise HTTPException(status_code=400, detail="Invalid package name")
            
        result = subprocess.run(
            [VENV_PIP, "install", pkg],
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

@router.websocket("/ws")
async def terminal_ws(websocket: WebSocket):
    """WebSocket endpoint for the interactive PTY terminal."""
    await websocket.accept()
    
    # Fork a new PTY for the bash shell
    pid, fd = pty.fork()
    if pid == 0:
        # Child process (Bash)
        os.environ["TERM"] = "xterm-256color"
        venv_bin = os.path.abspath(os.path.join("venv", "bin"))
        os.environ["PATH"] = f"{venv_bin}:{os.environ.get('PATH', '')}"
        
        # Source the virtual env activate script on start if possible
        rc_cmd = f"source {os.path.join(venv_bin, 'activate')}; exec bash"
        os.execv("/bin/bash", ["bash", "-c", rc_cmd])
    
    # Parent process (FastAPI server handling WebSocket)
    loop = asyncio.get_running_loop()
    
    # Set the PTY fd to non-blocking
    flags = fcntl.fcntl(fd, fcntl.F_GETFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
    
    def pty_read():
        try:
            data = os.read(fd, 4096)
            if data:
                asyncio.run_coroutine_threadsafe(
                    websocket.send_text(data.decode('utf-8', errors='replace')),
                    loop
                )
        except BlockingIOError:
            pass
        except OSError:
            loop.remove_reader(fd)
            
    loop.add_reader(fd, pty_read)
    
    try:
        while True:
            data = await websocket.receive_text()
            os.write(fd, data.encode('utf-8'))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        loop.remove_reader(fd)
        try:
            os.kill(pid, 9)
        except ProcessLookupError:
            pass
