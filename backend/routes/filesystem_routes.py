"""
File System API routes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from filesystem import FileSystem

router = APIRouter()

# Global file system instance
filesystem = FileSystem(total_blocks=100, block_size=4)


class CreateFileRequest(BaseModel):
    path: str
    size: int = 0


class CreateDirectoryRequest(BaseModel):
    path: str


class ReadFileRequest(BaseModel):
    path: str


class WriteFileRequest(BaseModel):
    path: str
    new_size: int


class DeleteRequest(BaseModel):
    path: str


@router.post("/create-file")
async def create_file(request: CreateFileRequest):
    """Create a new file."""
    try:
        success, message = filesystem.create_file(request.path, request.size)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            "success": True,
            "message": message,
            "filesystem_state": filesystem.get_state()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-directory")
async def create_directory(request: CreateDirectoryRequest):
    """Create a new directory."""
    try:
        success, message = filesystem.create_directory(request.path)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            "success": True,
            "message": message,
            "filesystem_state": filesystem.get_state()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/read-file")
async def read_file(request: ReadFileRequest):
    """Read a file."""
    try:
        success, message, file_entry = filesystem.read_file(request.path)
        
        if not success:
            raise HTTPException(status_code=404, detail=message)
        
        return {
            "success": True,
            "message": message,
            "file": file_entry.model_dump() if file_entry else None,
            "filesystem_state": filesystem.get_state()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/write-file")
async def write_file(request: WriteFileRequest):
    """Write to a file."""
    try:
        success, message = filesystem.write_file(request.path, request.new_size)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            "success": True,
            "message": message,
            "filesystem_state": filesystem.get_state()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete(request: DeleteRequest):
    """Delete a file or directory."""
    try:
        success, message = filesystem.delete_file(request.path)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            "success": True,
            "message": message,
            "filesystem_state": filesystem.get_state()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list/{path:path}")
async def list_directory(path: str = "/"):
    """List directory contents."""
    try:
        contents = filesystem.list_directory("/" + path if path else "/")
        
        return {
            "success": True,
            "path": "/" + path if path else "/",
            "contents": [entry.model_dump() for entry in contents]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/state")
async def get_filesystem_state():
    """Get current file system state."""
    try:
        return {
            "success": True,
            **filesystem.get_state()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset")
async def reset_filesystem():
    """Reset file system to initial state."""
    global filesystem
    filesystem = FileSystem(total_blocks=100, block_size=4)
    
    return {
        "success": True,
        "message": "File system reset",
        "filesystem_state": filesystem.get_state()
    }
