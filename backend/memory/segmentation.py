"""
Segmentation-based Memory Management Simulation.

This module implements segmented memory management with:
- Segment table creation and management
- Dynamic segment allocation with First Fit strategy
- Address translation (segment:offset -> physical address)
- Protection bit checking (Read/Write/Execute)
- External fragmentation tracking

Author: OS Simulator Project
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import copy


class AccessType(Enum):
    """Types of memory access operations."""
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"


@dataclass
class ProtectionBits:
    """
    Protection bits for a memory segment.
    
    Attributes:
        read: Allow read access
        write: Allow write access  
        execute: Allow execute access
    """
    read: bool = True
    write: bool = False
    execute: bool = False
    
    def to_dict(self) -> Dict:
        return {"read": self.read, "write": self.write, "execute": self.execute}
    
    def to_string(self) -> str:
        """Return R/W/X format string."""
        result = ""
        result += "R" if self.read else "-"
        result += "W" if self.write else "-"
        result += "X" if self.execute else "-"
        return result
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ProtectionBits':
        """Create ProtectionBits from dictionary."""
        return cls(
            read=data.get("read", True),
            write=data.get("write", False),
            execute=data.get("execute", False)
        )


@dataclass
class Segment:
    """
    Represents a memory segment.
    
    Attributes:
        segment_number: Unique identifier within the process
        name: Human-readable name (e.g., "Code", "Stack", "Heap")
        base_address: Starting physical address (None if not allocated)
        limit: Size of the segment in bytes
        protection: Access permissions
        is_allocated: Whether segment has physical memory
    """
    segment_number: int
    name: str
    limit: int  # Size of segment
    base_address: Optional[int] = None
    protection: ProtectionBits = field(default_factory=ProtectionBits)
    is_allocated: bool = False
    
    def to_dict(self) -> Dict:
        return {
            "segment_number": self.segment_number,
            "name": self.name,
            "base_address": self.base_address,
            "limit": self.limit,
            "protection": self.protection.to_dict(),
            "protection_string": self.protection.to_string(),
            "is_allocated": self.is_allocated
        }


@dataclass
class MemoryHole:
    """
    Represents a free memory region (hole).
    
    Attributes:
        start: Starting address of the hole
        size: Size of the hole in bytes
    """
    start: int
    size: int
    
    def to_dict(self) -> Dict:
        return {"start": self.start, "size": self.size, "end": self.start + self.size}


@dataclass 
class SegmentTableEntry:
    """
    Entry in a process's segment table.
    
    Attributes:
        pid: Process ID that owns this segment table
        segments: List of segments for this process
    """
    pid: int
    segments: List[Segment] = field(default_factory=list)


class SegmentationManager:
    """
    Manages segmented memory allocation and translation.
    
    This class simulates operating system segmentation features including:
    - Creating segment tables for processes
    - Allocating physical memory to segments (First Fit)
    - Translating logical addresses to physical addresses
    - Checking memory protection bits
    - Tracking external fragmentation
    
    Attributes:
        total_memory: Total physical memory size in bytes
        segment_tables: Dictionary mapping PID to segment table
        allocations: List of (start, size, pid, segment_num) tuples
        explanations: List of operation explanations for UI
    """
    
    def __init__(self, total_memory: int = 1024):
        """
        Initialize the segmentation manager.
        
        Args:
            total_memory: Total physical memory size (default: 1024 bytes)
        """
        if total_memory <= 0:
            raise ValueError("Total memory must be positive")
        if total_memory > 1048576:  # 1MB limit for simulation
            raise ValueError("Total memory too large (max 1MB)")
            
        self.total_memory = total_memory
        self.segment_tables: Dict[int, SegmentTableEntry] = {}
        
        # Track allocated regions: (start, size, pid, segment_num)
        self.allocations: List[Tuple[int, int, int, int]] = []
        
        # Explanations for UI feedback
        self.explanations: List[str] = []
        
        self._add_explanation(f"Initialized segmentation manager with {total_memory} bytes")
    
    def _add_explanation(self, text: str) -> None:
        """Add educational explanation for UI display."""
        self.explanations.append(text)
        # Keep only last 50 explanations to prevent memory bloat
        if len(self.explanations) > 50:
            self.explanations = self.explanations[-50:]
    
    def _find_holes(self) -> List[MemoryHole]:
        """
        Find all free memory regions (holes).
        
        Returns:
            List of MemoryHole objects sorted by start address
        """
        if not self.allocations:
            # Entire memory is free
            return [MemoryHole(start=0, size=self.total_memory)]
        
        # Sort allocations by start address
        sorted_allocs = sorted(self.allocations, key=lambda x: x[0])
        holes = []
        
        # Check for hole at the beginning
        if sorted_allocs[0][0] > 0:
            holes.append(MemoryHole(start=0, size=sorted_allocs[0][0]))
        
        # Check for holes between allocations
        for i in range(len(sorted_allocs) - 1):
            end_current = sorted_allocs[i][0] + sorted_allocs[i][1]
            start_next = sorted_allocs[i + 1][0]
            if start_next > end_current:
                holes.append(MemoryHole(start=end_current, size=start_next - end_current))
        
        # Check for hole at the end
        last_end = sorted_allocs[-1][0] + sorted_allocs[-1][1]
        if last_end < self.total_memory:
            holes.append(MemoryHole(start=last_end, size=self.total_memory - last_end))
        
        return holes
    
    def _first_fit_allocate(self, size: int) -> Optional[int]:
        """
        Find first hole that fits the requested size.
        
        Args:
            size: Required memory size in bytes
            
        Returns:
            Starting address if found, None if no suitable hole exists
        """
        holes = self._find_holes()
        for hole in holes:
            if hole.size >= size:
                self._add_explanation(
                    f"First Fit: Found hole at address {hole.start} "
                    f"(size {hole.size}) for request of {size} bytes"
                )
                return hole.start
        return None
    
    def create_segment_table(self, pid: int, segments_info: List[Dict]) -> Tuple[bool, Dict]:
        """
        Create a segment table for a process.
        
        Args:
            pid: Process ID (must be positive integer)
            segments_info: List of segment definitions with keys:
                - name: Segment name (string)
                - size: Segment size in bytes (positive integer)
                - protection: Dict with read/write/execute bools (optional)
                
        Returns:
            Tuple of (success: bool, result: Dict with details or error)
        """
        # --- Input Validation ---
        if not isinstance(pid, int) or pid < 0:
            return False, {"error": "Invalid PID: must be a non-negative integer"}
        
        if pid in self.segment_tables:
            return False, {"error": f"Segment table for PID {pid} already exists"}
        
        if not segments_info or not isinstance(segments_info, list):
            return False, {"error": "segments_info must be a non-empty list"}
        
        if len(segments_info) > 16:
            return False, {"error": "Too many segments (max 16 per process)"}
        
        # --- Create Segments ---
        segments = []
        total_size_needed = 0
        
        for i, seg_info in enumerate(segments_info):
            # Validate segment info
            if not isinstance(seg_info, dict):
                return False, {"error": f"Segment {i}: must be a dictionary"}
            
            name = seg_info.get("name", f"Segment_{i}")
            if not isinstance(name, str) or len(name) > 32:
                return False, {"error": f"Segment {i}: invalid name"}
            
            size = seg_info.get("size", 0)
            if not isinstance(size, int) or size <= 0:
                return False, {"error": f"Segment {i}: size must be a positive integer"}
            if size > self.total_memory:
                return False, {"error": f"Segment {i}: size exceeds total memory"}
            
            # Parse protection bits
            prot_info = seg_info.get("protection", {"read": True, "write": False, "execute": False})
            protection = ProtectionBits.from_dict(prot_info)
            
            segment = Segment(
                segment_number=i,
                name=name,
                limit=size,
                protection=protection,
                is_allocated=False
            )
            segments.append(segment)
            total_size_needed += size
        
        # Check if total size fits
        if total_size_needed > self.total_memory:
            self._add_explanation(
                f"⚠️ Warning: Total segment size ({total_size_needed}) "
                f"exceeds memory ({self.total_memory})"
            )
        
        # Create segment table entry
        self.segment_tables[pid] = SegmentTableEntry(pid=pid, segments=segments)
        
        self._add_explanation(
            f"Created segment table for P{pid} with {len(segments)} segments "
            f"(total size: {total_size_needed} bytes)"
        )
        
        return True, {
            "pid": pid,
            "num_segments": len(segments),
            "segments": [s.to_dict() for s in segments],
            "total_size": total_size_needed
        }
    
    def allocate_segment(self, pid: int, segment_num: int) -> Tuple[bool, Dict]:
        """
        Allocate physical memory for a segment using First Fit.
        
        Args:
            pid: Process ID
            segment_num: Segment number to allocate
            
        Returns:
            Tuple of (success: bool, result: Dict)
        """
        # --- Validation ---
        if pid not in self.segment_tables:
            return False, {"error": f"No segment table for PID {pid}"}
        
        table = self.segment_tables[pid]
        
        if segment_num < 0 or segment_num >= len(table.segments):
            return False, {"error": f"Invalid segment number: {segment_num}"}
        
        segment = table.segments[segment_num]
        
        if segment.is_allocated:
            return False, {
                "error": f"Segment {segment_num} ({segment.name}) is already allocated",
                "base_address": segment.base_address
            }
        
        # --- Find free memory using First Fit ---
        base_addr = self._first_fit_allocate(segment.limit)
        
        if base_addr is None:
            self._add_explanation(
                f"❌ Allocation failed: No hole large enough for segment "
                f"'{segment.name}' ({segment.limit} bytes)"
            )
            return False, {
                "error": "Insufficient contiguous memory",
                "segment_size": segment.limit,
                "largest_hole": max((h.size for h in self._find_holes()), default=0)
            }
        
        # --- Allocate the segment ---
        segment.base_address = base_addr
        segment.is_allocated = True
        self.allocations.append((base_addr, segment.limit, pid, segment_num))
        
        self._add_explanation(
            f"✅ Allocated segment '{segment.name}' (P{pid}:S{segment_num}) "
            f"at address {base_addr}-{base_addr + segment.limit - 1}"
        )
        
        return True, {
            "pid": pid,
            "segment_number": segment_num,
            "segment": segment.to_dict(),
            "base_address": base_addr,
            "memory_state": self.get_memory_state()
        }
    
    def deallocate_segment(self, pid: int, segment_num: int) -> Tuple[bool, Dict]:
        """
        Free memory allocated to a segment.
        
        Args:
            pid: Process ID
            segment_num: Segment number to deallocate
            
        Returns:
            Tuple of (success: bool, result: Dict)
        """
        # --- Validation ---
        if pid not in self.segment_tables:
            return False, {"error": f"No segment table for PID {pid}"}
        
        table = self.segment_tables[pid]
        
        if segment_num < 0 or segment_num >= len(table.segments):
            return False, {"error": f"Invalid segment number: {segment_num}"}
        
        segment = table.segments[segment_num]
        
        if not segment.is_allocated:
            return False, {"error": f"Segment {segment_num} is not allocated"}
        
        # --- Free the memory ---
        old_base = segment.base_address
        
        # Remove from allocations list
        self.allocations = [
            a for a in self.allocations
            if not (a[2] == pid and a[3] == segment_num)
        ]
        
        # Reset segment state
        segment.base_address = None
        segment.is_allocated = False
        
        self._add_explanation(
            f"🗑️ Deallocated segment '{segment.name}' (P{pid}:S{segment_num}) "
            f"from address {old_base}, freed {segment.limit} bytes"
        )
        
        return True, {
            "pid": pid,
            "segment_number": segment_num,
            "freed_address": old_base,
            "freed_size": segment.limit,
            "memory_state": self.get_memory_state()
        }
    
    def deallocate_process(self, pid: int) -> Tuple[bool, Dict]:
        """
        Free all memory allocated to a process and remove its segment table.
        
        Args:
            pid: Process ID
            
        Returns:
            Tuple of (success: bool, result: Dict)
        """
        if pid not in self.segment_tables:
            return False, {"error": f"No segment table for PID {pid}"}
        
        table = self.segment_tables[pid]
        freed_segments = []
        total_freed = 0
        
        for segment in table.segments:
            if segment.is_allocated:
                freed_segments.append(segment.segment_number)
                total_freed += segment.limit
        
        # Remove all allocations for this process
        self.allocations = [a for a in self.allocations if a[2] != pid]
        
        # Remove segment table
        del self.segment_tables[pid]
        
        self._add_explanation(
            f"🧹 Terminated P{pid}: freed {len(freed_segments)} segments, "
            f"{total_freed} bytes total"
        )
        
        return True, {
            "pid": pid,
            "freed_segments": freed_segments,
            "total_freed": total_freed,
            "memory_state": self.get_memory_state()
        }
    
    def translate_address(
        self, pid: int, segment_num: int, offset: int
    ) -> Tuple[bool, Dict]:
        """
        Translate logical address (segment:offset) to physical address.
        
        The translation process:
        1. Validate segment exists and is allocated
        2. Check offset is within segment bounds (0 <= offset < limit)
        3. Calculate physical address = base + offset
        
        Args:
            pid: Process ID
            segment_num: Segment number
            offset: Offset within the segment
            
        Returns:
            Tuple of (success: bool, result: Dict with physical_address or error)
        """
        # --- Validation ---
        if pid not in self.segment_tables:
            return False, {"error": f"No segment table for PID {pid}"}
        
        table = self.segment_tables[pid]
        
        if segment_num < 0 or segment_num >= len(table.segments):
            return False, {"error": f"Invalid segment number: {segment_num}"}
        
        segment = table.segments[segment_num]
        
        if not segment.is_allocated:
            self._add_explanation(
                f"❌ Segment fault: Segment {segment_num} ({segment.name}) not in memory"
            )
            return False, {
                "error": "Segment not allocated",
                "fault_type": "segment_fault",
                "segment_number": segment_num
            }
        
        # --- Bounds Check ---
        if offset < 0:
            return False, {
                "error": "Negative offset not allowed",
                "fault_type": "invalid_offset"
            }
        
        if offset >= segment.limit:
            self._add_explanation(
                f"❌ Segmentation fault: Offset {offset} exceeds limit {segment.limit} "
                f"for segment '{segment.name}'"
            )
            return False, {
                "error": f"Offset {offset} exceeds segment limit {segment.limit}",
                "fault_type": "bounds_violation",
                "segment_limit": segment.limit,
                "requested_offset": offset
            }
        
        # --- Calculate Physical Address ---
        physical_address = segment.base_address + offset
        
        self._add_explanation(
            f"📍 Address translation: P{pid}:S{segment_num}+{offset} "
            f"→ {segment.base_address}+{offset} = {physical_address}"
        )
        
        return True, {
            "logical_address": {"segment": segment_num, "offset": offset},
            "segment_name": segment.name,
            "base_address": segment.base_address,
            "limit": segment.limit,
            "physical_address": physical_address,
            "translation": f"base({segment.base_address}) + offset({offset}) = {physical_address}"
        }
    
    def check_protection(
        self, pid: int, segment_num: int, access_type: str
    ) -> Tuple[bool, Dict]:
        """
        Check if a memory access is permitted by protection bits.
        
        Args:
            pid: Process ID
            segment_num: Segment number
            access_type: "read", "write", or "execute"
            
        Returns:
            Tuple of (allowed: bool, result: Dict)
        """
        # --- Validation ---
        if pid not in self.segment_tables:
            return False, {"error": f"No segment table for PID {pid}"}
        
        table = self.segment_tables[pid]
        
        if segment_num < 0 or segment_num >= len(table.segments):
            return False, {"error": f"Invalid segment number: {segment_num}"}
        
        segment = table.segments[segment_num]
        
        # Validate access type
        try:
            access = AccessType(access_type.lower())
        except ValueError:
            return False, {"error": f"Invalid access type: {access_type}"}
        
        # --- Check Protection ---
        protection = segment.protection
        allowed = False
        
        if access == AccessType.READ:
            allowed = protection.read
        elif access == AccessType.WRITE:
            allowed = protection.write
        elif access == AccessType.EXECUTE:
            allowed = protection.execute
        
        if allowed:
            self._add_explanation(
                f"✅ Protection check passed: {access.value.upper()} access "
                f"to '{segment.name}' ({protection.to_string()})"
            )
        else:
            self._add_explanation(
                f"🚫 Protection violation: {access.value.upper()} access denied "
                f"to '{segment.name}' ({protection.to_string()})"
            )
        
        return allowed, {
            "allowed": allowed,
            "access_type": access_type,
            "segment_name": segment.name,
            "protection_bits": protection.to_dict(),
            "protection_string": protection.to_string(),
            "violation": not allowed
        }
    
    def calculate_fragmentation(self) -> Dict:
        """
        Calculate external fragmentation statistics.
        
        Returns:
            Dict with fragmentation metrics
        """
        holes = self._find_holes()
        
        total_free = sum(h.size for h in holes)
        largest_hole = max((h.size for h in holes), default=0)
        num_holes = len(holes)
        
        # External fragmentation ratio: 1 - (largest_hole / total_free)
        # This shows how fragmented the free memory is
        if total_free > 0:
            fragmentation_ratio = 1 - (largest_hole / total_free)
        else:
            fragmentation_ratio = 0
        
        used_memory = self.total_memory - total_free
        
        return {
            "total_memory": self.total_memory,
            "used_memory": used_memory,
            "free_memory": total_free,
            "num_holes": num_holes,
            "largest_hole": largest_hole,
            "fragmentation_ratio": round(fragmentation_ratio, 4),
            "fragmentation_percent": round(fragmentation_ratio * 100, 2),
            "utilization_percent": round((used_memory / self.total_memory) * 100, 2),
            "holes": [h.to_dict() for h in holes]
        }
    
    def get_segment_table(self, pid: int) -> Optional[List[Dict]]:
        """
        Get segment table for visualization.
        
        Args:
            pid: Process ID
            
        Returns:
            List of segment dictionaries, or None if PID not found
        """
        if pid not in self.segment_tables:
            return None
        
        return [seg.to_dict() for seg in self.segment_tables[pid].segments]
    
    def get_memory_state(self) -> Dict:
        """
        Get complete memory state for visualization.
        
        Returns:
            Dict with all memory information
        """
        # Build memory map
        memory_map = []
        
        # Add allocated regions
        for start, size, pid, seg_num in self.allocations:
            table = self.segment_tables.get(pid)
            if table and seg_num < len(table.segments):
                segment = table.segments[seg_num]
                memory_map.append({
                    "type": "segment",
                    "start": start,
                    "size": size,
                    "end": start + size,
                    "pid": pid,
                    "segment_number": seg_num,
                    "segment_name": segment.name,
                    "protection": segment.protection.to_string()
                })
        
        # Add holes
        for hole in self._find_holes():
            memory_map.append({
                "type": "hole",
                "start": hole.start,
                "size": hole.size,
                "end": hole.start + hole.size
            })
        
        # Sort by start address
        memory_map.sort(key=lambda x: x["start"])
        
        return {
            "total_memory": self.total_memory,
            "memory_map": memory_map,
            "processes": list(self.segment_tables.keys()),
            "segment_tables": {
                pid: [s.to_dict() for s in table.segments]
                for pid, table in self.segment_tables.items()
            },
            "fragmentation": self.calculate_fragmentation(),
            "explanations": self.explanations[-10:]  # Last 10 explanations
        }
    
    def reset(self) -> Dict:
        """
        Reset the manager to initial state.
        
        Returns:
            Confirmation dict
        """
        self.segment_tables.clear()
        self.allocations.clear()
        self.explanations.clear()
        self._add_explanation(f"Memory reset: {self.total_memory} bytes available")
        
        return {
            "success": True,
            "message": "Segmentation manager reset",
            "total_memory": self.total_memory
        }
