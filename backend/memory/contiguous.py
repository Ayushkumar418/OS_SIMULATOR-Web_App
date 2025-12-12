"""
Contiguous Memory Allocation Module
Implements First Fit, Best Fit, Worst Fit, and Next Fit algorithms.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class AllocationAlgorithm(Enum):
    FIRST_FIT = "first_fit"
    BEST_FIT = "best_fit"
    WORST_FIT = "worst_fit"
    NEXT_FIT = "next_fit"


@dataclass
class MemoryBlock:
    """Represents a memory block"""
    start_address: int
    size: int
    is_allocated: bool
    process_id: Optional[int] = None
    
    @property
    def end_address(self) -> int:
        return self.start_address + self.size - 1
    
    def to_dict(self) -> Dict:
        return {
            "start": self.start_address,
            "size": self.size,
            "end": self.end_address,
            "allocated": self.is_allocated,
            "process_id": self.process_id
        }


class ContiguousMemoryManager:
    """Manages contiguous memory allocation using various algorithms"""
    
    def __init__(self, total_memory: int = 1000):
        """Initialize memory manager with specified total memory size"""
        self.total_memory = total_memory
        self.blocks: List[MemoryBlock] = [
            MemoryBlock(start_address=0, size=total_memory, is_allocated=False)
        ]
        self.next_fit_pointer = 0  # For next fit algorithm
        self.explanations: List[str] = []
        
    def allocate(self, process_id: int, size: int, algorithm: AllocationAlgorithm) -> Tuple[bool, Dict]:
        """
        Allocate memory for a process using specified algorithm
        Returns: (success, result_dict)
        """
        self.explanations = []
        self.explanations.append(f"Attempting to allocate {size} KB for Process {process_id}")
        self.explanations.append(f"Using algorithm: {algorithm.value}")
        
        # Find suitable block based on algorithm
        block_index = None
        if algorithm == AllocationAlgorithm.FIRST_FIT:
            block_index = self._first_fit(size)
        elif algorithm == AllocationAlgorithm.BEST_FIT:
            block_index = self._best_fit(size)
        elif algorithm == AllocationAlgorithm.WORST_FIT:
            block_index = self._worst_fit(size)
        elif algorithm == AllocationAlgorithm.NEXT_FIT:
            block_index = self._next_fit(size)
        
        if block_index is None:
            self.explanations.append(f"❌ Allocation failed - No suitable block found")
            return False, {
                "success": False,
                "message": "No suitable block found",
                "explanations": self.explanations,
                "memory_state": self.get_memory_state()
            }
        
        # Allocate the block
        block = self.blocks[block_index]
        self.explanations.append(f"✓ Found suitable block at address {block.start_address} (size: {block.size} KB)")
        
        # If block is larger than needed, split it
        if block.size > size:
            # Create new free block with remaining space
            new_block = MemoryBlock(
                start_address=block.start_address + size,
                size=block.size - size,
                is_allocated=False
            )
            self.blocks.insert(block_index + 1, new_block)
            self.explanations.append(f"Split block: Allocated {size} KB, {new_block.size} KB remains free")
        
        # Update the allocated block
        block.size = size
        block.is_allocated = True
        block.process_id = process_id
        
        self.explanations.append(f"✓ Process {process_id} allocated at address {block.start_address}")
        
        return True, {
            "success": True,
            "allocated_block": block.to_dict(),
            "explanations": self.explanations,
            "memory_state": self.get_memory_state(),
            "fragmentation": self.calculate_fragmentation()
        }
    
    def deallocate(self, process_id: int) -> Tuple[bool, Dict]:
        """
        Deallocate memory for a process
        """
        self.explanations = []
        self.explanations.append(f"Attempting to deallocate Process {process_id}")
        
        # Find the block allocated to this process
        block_index = None
        for i, block in enumerate(self.blocks):
            if block.is_allocated and block.process_id == process_id:
                block_index = i
                break
        
        if block_index is None:
            self.explanations.append(f"❌ Process {process_id} not found in memory")
            return False, {
                "success": False,
                "message": "Process not found",
                "explanations": self.explanations
            }
        
        # Free the block
        block = self.blocks[block_index]
        self.explanations.append(f"Freeing {block.size} KB at address {block.start_address}")
        block.is_allocated = False
        block.process_id = None
        
        # Merge with adjacent free blocks (coalescing)
        self._coalesce_blocks()
        self.explanations.append("✓ Memory deallocated and coalesced with adjacent free blocks")
        
        return True, {
            "success": True,
            "explanations": self.explanations,
            "memory_state": self.get_memory_state(),
            "fragmentation": self.calculate_fragmentation()
        }
    
    def _first_fit(self, size: int) -> Optional[int]:
        """Find first block that fits"""
        self.explanations.append("Searching from beginning for first fit...")
        for i, block in enumerate(self.blocks):
            if not block.is_allocated and block.size >= size:
                self.explanations.append(f"Found block at index {i}")
                return i
        return None
    
    def _best_fit(self, size: int) -> Optional[int]:
        """Find smallest block that fits"""
        self.explanations.append("Searching for smallest suitable block (best fit)...")
        best_index = None
        smallest_size = float('inf')
        
        for i, block in enumerate(self.blocks):
            if not block.is_allocated and block.size >= size:
                if block.size < smallest_size:
                    smallest_size = block.size
                    best_index = i
        
        if best_index is not None:
            self.explanations.append(f"Best fit found at index {best_index} (size: {smallest_size} KB)")
        return best_index
    
    def _worst_fit(self, size: int) -> Optional[int]:
        """Find largest block that fits"""
        self.explanations.append("Searching for largest suitable block (worst fit)...")
        worst_index = None
        largest_size = -1
        
        for i, block in enumerate(self.blocks):
            if not block.is_allocated and block.size >= size:
                if block.size > largest_size:
                    largest_size = block.size
                    worst_index = i
        
        if worst_index is not None:
            self.explanations.append(f"Worst fit found at index {worst_index} (size: {largest_size} KB)")
        return worst_index
    
    def _next_fit(self, size: int) -> Optional[int]:
        """Find next block that fits, starting from last allocation"""
        self.explanations.append(f"Searching from pointer position {self.next_fit_pointer} (next fit)...")
        
        # Search from current pointer to end
        for i in range(self.next_fit_pointer, len(self.blocks)):
            block = self.blocks[i]
            if not block.is_allocated and block.size >= size:
                self.next_fit_pointer = i
                self.explanations.append(f"Found block at index {i}")
                return i
        
        # Wrap around and search from beginning to pointer
        for i in range(0, self.next_fit_pointer):
            block = self.blocks[i]
            if not block.is_allocated and block.size >= size:
                self.next_fit_pointer = i
                self.explanations.append(f"Found block at index {i} (wrapped around)")
                return i
        
        return None
    
    def _coalesce_blocks(self):
        """Merge adjacent free blocks"""
        i = 0
        while i < len(self.blocks) - 1:
            current = self.blocks[i]
            next_block = self.blocks[i + 1]
            
            # If both blocks are free and adjacent, merge them
            if (not current.is_allocated and not next_block.is_allocated and
                current.end_address + 1 == next_block.start_address):
                current.size += next_block.size
                self.blocks.pop(i + 1)
                self.explanations.append(f"Merged blocks at address {current.start_address}")
            else:
                i += 1
    
    def calculate_fragmentation(self) -> Dict:
        """Calculate internal and external fragmentation"""
        external_frag_count = 0
        external_frag_total = 0
        total_free = 0
        largest_free = 0
        
        for block in self.blocks:
            if not block.is_allocated:
                external_frag_count += 1
                external_frag_total += block.size
                total_free += block.size
                largest_free = max(largest_free, block.size)
        
        return {
            "external_fragments": external_frag_count,
            "external_fragmentation_total": external_frag_total,
            "largest_free_block": largest_free,
            "total_free_memory": total_free,
           "total_allocated": sum(b.size for b in self.blocks if b.is_allocated),
            "fragmentation_percentage": round((external_frag_total - largest_free) / self.total_memory * 100, 2) if total_free > 0 else 0
        }
    
    def get_memory_state(self) -> Dict:
        """Get current state of all memory blocks"""
        return {
            "total_memory": self.total_memory,
            "blocks": [block.to_dict() for block in self.blocks],
            "num_blocks": len(self.blocks),
            "allocated_blocks": sum(1 for b in self.blocks if b.is_allocated),
            "free_blocks": sum(1 for b in self.blocks if not b.is_allocated)
        }
    
    def reset(self):
        """Reset memory to initial state"""
        self.blocks = [MemoryBlock(start_address=0, size=self.total_memory, is_allocated=False)]
        self.next_fit_pointer = 0
        self.explanations = []
