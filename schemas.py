from pydantic import BaseModel
from typing import Optional

class FileWriteRequest(BaseModel):
    path: str
    content: str

class DBConnectRequest(BaseModel):
    db_url: str

class DBQueryRequest(BaseModel):
    db_url: str
    query: str

class RunRequest(BaseModel):
    path: str

class InstallRequest(BaseModel):
    package_name: str

class CommandRunRequest(BaseModel):
    command: str
    cwd: str = "."
    env: dict = {}

class GitCommandRequest(BaseModel):
    command: str
    cwd: str = "."

class GitCloneRequest(BaseModel):
    repo_url: str
    target_dir: str = "."
