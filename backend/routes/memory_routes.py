"""
Memory Management API routes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from memory.paging import PagingManager
from memory.page_replacement import (
    FIFOReplacement, LRUReplacement, OptimalReplacement,
    simulate_page_replacement
)

router = APIRouter()

# Global paging manager instances (in production, use proper state management)
paging_managers = {}


class CreatePageTableRequest(BaseModel):
    pid: int
    num_pages: int
    num_frames: int = 64
    page_size: int = 4


class AllocatePageRequest(BaseModel):
    pid: int
    page_number: int


class AccessPageRequest(BaseModel):
    pid: int
    page_number: int


class TranslateAddressRequest(BaseModel):
    pid: int
    virtual_address: int


class PageReplacementRequest(BaseModel):
    algorithm: str  # "fifo", "lru", "optimal"
    num_frames: int
    reference_string: List[int]


@router.post("/create-page-table")
async def create_page_table(request: CreatePageTableRequest):
    """Create a page table for a process."""
    try:
        # Create or get manager
        if "default" not in paging_managers:
            paging_managers["default"] = PagingManager(
                num_frames=request.num_frames,
                page_size=request.page_size
            )
        
        manager = paging_managers["default"]
        success = manager.create_page_table(request.pid, request.num_pages)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to create page table")
        
        return {
            "success": True,
            "pid": request.pid,
            "num_pages": request.num_pages,
            "page_table": manager.get_page_table(request.pid),
            "memory_state": manager.get_memory_state()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/allocate-page")
async def allocate_page(request: AllocatePageRequest):
    """Allocate a physical frame for a virtual page."""
    try:
        if "default" not in paging_managers:
            raise HTTPException(status_code=400, detail="No paging manager initialized")
        
        manager = paging_managers["default"]
        success, frame_num = manager.allocate_page(request.pid, request.page_number)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to allocate page")
        
        return {
            "success": True,
            "pid": request.pid,
            "page_number": request.page_number,
            "frame_number": frame_num,
            "page_table": manager.get_page_table(request.pid),
            "memory_state": manager.get_memory_state()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/access-page")
async def access_page(request: AccessPageRequest):
    """Access a virtual page (may cause page fault)."""
    try:
        if "default" not in paging_managers:
            raise HTTPException(status_code=400, detail="No paging manager initialized")
        
        manager = paging_managers["default"]
        success, frame_num, page_fault = manager.access_page(request.pid, request.page_number)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to access page")
        
        return {
            "success": True,
            "pid": request.pid,
            "page_number": request.page_number,
            "frame_number": frame_num,
            "page_fault": page_fault,
            "page_table": manager.get_page_table(request.pid),
            "memory_state": manager.get_memory_state()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate-address")
async def translate_address(request: TranslateAddressRequest):
    """Translate virtual address to physical address."""
    try:
        if "default" not in paging_managers:
            raise HTTPException(status_code=400, detail="No paging manager initialized")
        
        manager = paging_managers["default"]
        success, physical_addr, page_fault = manager.translate_address(
            request.pid,
            request.virtual_address
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to translate address")
        
        return {
            "success": True,
            "virtual_address": request.virtual_address,
            "physical_address": physical_addr,
            "page_fault": page_fault,
            "explanations": manager.explanations[-5:] if manager.explanations else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/page-replacement")
async def run_page_replacement(request: PageReplacementRequest):
    """Simulate page replacement algorithms."""
    try:
        # Select algorithm
        if request.algorithm.lower() == "fifo":
            algorithm = FIFOReplacement(request.num_frames)
        elif request.algorithm.lower() == "lru":
            algorithm = LRUReplacement(request.num_frames)
        elif request.algorithm.lower() == "optimal":
            algorithm = OptimalReplacement(request.num_frames, request.reference_string)
        else:
            raise HTTPException(status_code=400, detail="Invalid algorithm")
        
        # Run simulation
        results = simulate_page_replacement(algorithm, request.reference_string)
        
        return {
            "success": True,
            **results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/state")
async def get_memory_state():
    """Get current memory state."""
    try:
        if "default" not in paging_managers:
            return {
                "initialized": False,
                "message": "No paging manager initialized"
            }
        
        manager = paging_managers["default"]
        return {
            "initialized": True,
            **manager.get_memory_state()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset")
async def reset_memory():
    """Reset memory manager."""
    paging_managers.clear()
    return {"success": True, "message": "Memory manager reset"}
