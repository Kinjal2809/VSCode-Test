import os
import aiofiles
from fastapi import APIRouter, HTTPException
from schemas import FileWriteRequest

router = APIRouter()

@router.get("/list")
async def list_directory(path: str = "."):
    """List all files and directories in the specified path."""
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Path not found")
        
        items = []
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            is_dir = os.path.isdir(item_path)
            items.append({
                "name": item,
                "path": item_path,
                "is_dir": is_dir,
                "size": os.path.getsize(item_path) if not is_dir else 0
            })
        
        # Sort directories first, then files
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {"path": path, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/read")
async def read_file(path: str):
    """Read the content of a file."""
    try:
        if not os.path.exists(path) or not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="File not found")
            
        async with aiofiles.open(path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            
        return {"path": path, "content": content}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cannot read binary files as text")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/write")
async def write_file(request: FileWriteRequest):
    """Write content to a file (overwrites existing)."""
    try:
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(os.path.abspath(request.path)), exist_ok=True)
        
        async with aiofiles.open(request.path, mode='w', encoding='utf-8') as f:
            await f.write(request.content)
            
        return {"message": "File written successfully", "path": request.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
