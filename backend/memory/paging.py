"""
Paging-based memory management simulation.
Implements virtual memory with paging, page tables, and page fault handling.
"""

from typing import Dict, List, Optional, Tuple
from models import MemoryPage, PageTableEntry, MemoryFrame, PageFaultEvent
import copy


class PagingManager:
    """
    Simulates paging-based memory management.
    Manages page tables, physical frames, and page faults.
    """
    
    def __init__(self, num_frames: int = 64, page_size: int = 4):
        """
        Initialize paging manager.
        
        Args:
            num_frames: Total number of physical memory frames
            page_size: Size of each page in KB
        """
        self.num_frames = num_frames
        self.page_size = page_size
        self.total_memory = num_frames * page_size  # Total memory in KB
        
        # Physical memory frames
        self.frames: List[MemoryFrame] = [
            MemoryFrame(frame_number=i, occupied=False)
            for i in range(num_frames)
        ]
        
        # Page tables for each process (pid -> page table)
        self.page_tables: Dict[int, List[PageTableEntry]] = {}
        
        # Page fault tracking
        self.page_faults: List[PageFaultEvent] = []
        self.current_time = 0
        
        # Free frame list
        self.free_frames: List[int] = list(range(num_frames))
        
        # Explanations
        self.explanations: List[str] = []
    
    def create_page_table(self, pid: int, num_pages: int) -> bool:
        """
        Create a page table for a process.
        
        Args:
            pid: Process ID
            num_pages: Number of pages needed
            
        Returns:
            True if successful, False if not enough memory
        """
        if pid in self.page_tables:
            self._add_explanation(f"Page table for P{pid} already exists")
            return True
        
        # Create empty page table
        page_table = [
            PageTableEntry(page_number=i, valid=False)
            for i in range(num_pages)
        ]
        
        self.page_tables[pid] = page_table
        
        self._add_explanation(
            f"Created page table for P{pid} with {num_pages} pages "
            f"({num_pages * self.page_size}KB required)"
        )
        
        return True
    
    def allocate_page(self, pid: int, page_number: int) -> Tuple[bool, Optional[int]]:
        """
        Allocate a physical frame for a virtual page.
        
        Args:
            pid: Process ID
            page_number: Virtual page number
            
        Returns:
            (success, frame_number)
        """
        if pid not in self.page_tables:
            return False, None
        
        if page_number >= len(self.page_tables[pid]):
            return False, None
        
        # Check if already allocated
        page_entry = self.page_tables[pid][page_number]
        if page_entry.valid:
            return True, page_entry.frame_number
        
        # Allocate a free frame
        if not self.free_frames:
            self._add_explanation(f"No free frames available for P{pid} page {page_number}")
            return False, None
        
        frame_num = self.free_frames.pop(0)
        
        # Update page table
        page_entry.frame_number = frame_num
        page_entry.valid = True
        page_entry.referenced = True
        
        # Update frame
        self.frames[frame_num].occupied = True
        self.frames[frame_num].pid = pid
        self.frames[frame_num].page_number = page_number
        
        self._add_explanation(
            f"Allocated frame {frame_num} to P{pid} page {page_number}. "
            f"Free frames remaining: {len(self.free_frames)}"
        )
        
        return True, frame_num
    
    def access_page(self, pid: int, page_number: int) -> Tuple[bool, Optional[int], bool]:
        """
        Access a virtual page (may cause page fault).
        
        Args:
            pid: Process ID
            page_number: Virtual page number to access
            
        Returns:
            (success, frame_number, page_fault_occurred)
        """
        if pid not in self.page_tables:
            return False, None, False
        
        if page_number >= len(self.page_tables[pid]):
            self._add_explanation(f"Invalid page access: P{pid} page {page_number}")
            return False, None, False
        
        page_entry = self.page_tables[pid][page_number]
        
        # Check if page is in memory
        if page_entry.valid:
            # Page hit
            page_entry.referenced = True
            self._add_explanation(
                f"Page hit: P{pid} page {page_number} -> frame {page_entry.frame_number}"
            )
            return True, page_entry.frame_number, False
        else:
            # Page fault
            self._add_explanation(
                f"⚠️ Page fault: P{pid} page {page_number} not in memory"
            )
            
            # Record page fault
            fault = PageFaultEvent(
                time=self.current_time,
                pid=pid,
                page_number=page_number,
                replacement_algorithm="demand_paging"
            )
            self.page_faults.append(fault)
            
            # Allocate frame (simplified - in real systems would load from disk)
            success, frame_num = self.allocate_page(pid, page_number)
            
            if success:
                fault.frame_allocated = frame_num
                self._add_explanation(
                    f"Page fault handled: Loaded P{pid} page {page_number} into frame {frame_num}"
                )
            
            return success, frame_num, True
    
    def translate_address(self, pid: int, virtual_address: int) -> Tuple[bool, Optional[int], bool]:
        """
        Translate virtual address to physical address.
        
        Args:
            pid: Process ID
            virtual_address: Virtual address to translate
            
        Returns:
            (success, physical_address, page_fault_occurred)
        """
        # Calculate page number and offset
        page_number = virtual_address // self.page_size
        offset = virtual_address % self.page_size
        
        self._add_explanation(
            f"Translating virtual address {virtual_address}: "
            f"page={page_number}, offset={offset}"
        )
        
        # Access the page
        success, frame_num, page_fault = self.access_page(pid, page_number)
        
        if not success:
            return False, None, page_fault
        
        # Calculate physical address
        physical_address = frame_num * self.page_size + offset
        
        self._add_explanation(
            f"Physical address: frame {frame_num} + offset {offset} = {physical_address}"
        )
        
        return True, physical_address, page_fault
    
    def deallocate_process(self, pid: int) -> int:
        """
        Free all frames allocated to a process.
        
        Args:
            pid: Process ID
            
        Returns:
            Number of frames freed
        """
        if pid not in self.page_tables:
            return 0
        
        frames_freed = 0
        
        # Free all allocated frames
        for page_entry in self.page_tables[pid]:
            if page_entry.valid and page_entry.frame_number is not None:
                frame_num = page_entry.frame_number
                
                # Free the frame
                self.frames[frame_num].occupied = False
                self.frames[frame_num].pid = None
                self.frames[frame_num].page_number = None
                self.free_frames.append(frame_num)
                
                frames_freed += 1
        
        # Remove page table
        del self.page_tables[pid]
        
        self._add_explanation(
            f"Deallocated P{pid}: freed {frames_freed} frames. "
            f"Free frames: {len(self.free_frames)}"
        )
        
        return frames_freed
    
    def get_page_table(self, pid: int) -> Optional[List[Dict]]:
        """Get page table for visualization"""
        if pid not in self.page_tables:
            return None
        
        return [
            {
                "page_number": entry.page_number,
                "frame_number": entry.frame_number,
                "valid": entry.valid,
                "referenced": entry.referenced,
                "modified": entry.modified
            }
            for entry in self.page_tables[pid]
        ]
    
    def get_memory_state(self) -> Dict:
        """Get current memory state for visualization"""
        return {
            "total_frames": self.num_frames,
            "free_frames": len(self.free_frames),
            "used_frames": self.num_frames - len(self.free_frames),
            "page_size": self.page_size,
            "total_memory": self.total_memory,
            "frames": [
                {
                    "frame_number": f.frame_number,
                    "occupied": f.occupied,
                    "pid": f.pid,
                    "page_number": f.page_number
                }
                for f in self.frames
            ],
            "page_faults": len(self.page_faults),
            "explanations": self.explanations
        }
    
    def _add_explanation(self, text: str):
        """Add educational explanation"""
        self.explanations.append(f"[t={self.current_time}] {text}")
