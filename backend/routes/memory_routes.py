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
from memory.contiguous import ContiguousMemoryManager, AllocationAlgorithm

router = APIRouter()

# Global managers (in production, use proper state management)
paging_managers = {}
contiguous_manager = None  # Will be initialized on first use


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


class ContiguousAllocateRequest(BaseModel):
    process_id: int
    size: int
    algorithm: str  # "first_fit", "best_fit", "worst_fit", "next_fit"
    total_memory: Optional[int] = 1000


class ContiguousDeallocateRequest(BaseModel):
    process_id: int


@router.post("/contiguous/allocate")
async def allocate_contiguous(request: ContiguousAllocateRequest):
    """Allocate memory using contiguous allocation algorithms"""
    global contiguous_manager
    
    try:
        # Always reinitialize manager if total_memory is provided and different
        if request.total_memory:
            if contiguous_manager is None or contiguous_manager.total_memory != request.total_memory:
                contiguous_manager = ContiguousMemoryManager(total_memory=request.total_memory)
        elif contiguous_manager is None:
            # Initialize with default if not provided
            contiguous_manager = ContiguousMemoryManager(total_memory=1000)
        
        # Parse algorithm
        try:
            algorithm = AllocationAlgorithm(request.algorithm.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid algorithm: {request.algorithm}")
        
        # Allocate memory
        success, result = contiguous_manager.allocate(
            process_id=request.process_id,
            size=request.size,
            algorithm=algorithm
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=result.get("message", "Allocation failed"))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contiguous/deallocate")
async def deallocate_contiguous(request: ContiguousDeallocateRequest):
    """Deallocate memory for a process"""
    global contiguous_manager
    
    try:
        if contiguous_manager is None:
            raise HTTPException(status_code=400, detail="No memory manager initialized")
        
        success, result = contiguous_manager.deallocate(request.process_id)
        
        if not success:
            raise HTTPException(status_code=400, detail=result.get("message", "Deallocation failed"))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contiguous/state")
async def get_contiguous_state():
    """Get current contiguous memory state"""
    global contiguous_manager
    
    if contiguous_manager is None:
        return {
            "initialized": False,
            "message": "No contiguous memory manager initialized"
        }
    
    return {
        "initialized": True,
        **contiguous_manager.get_memory_state(),
        "fragmentation": contiguous_manager.calculate_fragmentation()
    }


@router.post("/contiguous/reset")
async def reset_contiguous():
    """Reset contiguous memory manager"""
    global contiguous_manager
    
    # Set to None to force reinitialization with new size
    contiguous_manager = None
    
    return {"success": True, "message": "Contiguous memory manager reset"}


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
