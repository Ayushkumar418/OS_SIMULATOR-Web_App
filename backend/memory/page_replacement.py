"""
Page replacement algorithms for handling page faults when memory is full.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Tuple
from collections import deque


class PageReplacementAlgorithm(ABC):
    """Abstract base class for page replacement algorithms"""
    
    def __init__(self):
        self.page_faults = 0
        self.replacements = 0
        self.history: List[Dict] = []
    
    @abstractmethod
    def access_page(self, page_num: int, frames: List[Optional[int]]) -> Tuple[bool, Optional[int], Optional[int]]:
        """
        Access a page and handle replacement if needed.
        
        Args:
            page_num: Page number being accessed
            frames: Current frames in memory
            
        Returns:
            (page_fault_occurred, victim_page, frame_used)
        """
        pass
    
    @abstractmethod
    def reset(self):
        """Reset algorithm state"""
        pass


class FIFOReplacement(PageReplacementAlgorithm):
    """
    First-In-First-Out (FIFO) page replacement.
    Replaces the oldest page in memory.
    """
    
    def __init__(self, num_frames: int):
        super().__init__()
        self.num_frames = num_frames
        self.frames: List[Optional[int]] = [None] * num_frames
        self.queue: deque = deque()
        self.algorithm_name = "FIFO"
    
    def access_page(self, page_num: int, reference_string: List[int] = None) -> Tuple[bool, Optional[int], Optional[int]]:
        """Access page with FIFO replacement"""
        # Check if page already in memory
        if page_num in self.frames:
            # Page hit
            self.history.append({
                "page": page_num,
                "frames": self.frames.copy(),
                "fault": False,
                "victim": None
            })
            return False, None, self.frames.index(page_num)
        
        # Page fault
        self.page_faults += 1
        victim = None
        frame_used = None
        
        # Find empty frame first
        if None in self.frames:
            frame_idx = self.frames.index(None)
            self.frames[frame_idx] = page_num
            self.queue.append(page_num)
            frame_used = frame_idx
        else:
            # No empty frame, replace oldest (FIFO)
            victim = self.queue.popleft()
            victim_idx = self.frames.index(victim)
            self.frames[victim_idx] = page_num
            self.queue.append(page_num)
            frame_used = victim_idx
            self.replacements += 1
        
        self.history.append({
            "page": page_num,
            "frames": self.frames.copy(),
            "fault": True,
            "victim": victim
        })
        
        return True, victim, frame_used
    
    def reset(self):
        """Reset FIFO state"""
        self.frames = [None] * self.num_frames
        self.queue = deque()
        self.page_faults = 0
        self.replacements = 0
        self.history = []


class LRUReplacement(PageReplacementAlgorithm):
    """
    Least Recently Used (LRU) page replacement.
    Replaces the page that hasn't been used for the longest time.
    """
    
    def __init__(self, num_frames: int):
        super().__init__()
        self.num_frames = num_frames
        self.frames: List[Optional[int]] = [None] * num_frames
        self.recent_use: Dict[int, int] = {}  # page -> last access time
        self.time = 0
        self.algorithm_name = "LRU"
    
    def access_page(self, page_num: int, reference_string: List[int] = None) -> Tuple[bool, Optional[int], Optional[int]]:
        """Access page with LRU replacement"""
        self.time += 1
        
        # Check if page in memory
        if page_num in self.frames:
            # Page hit - update access time
            self.recent_use[page_num] = self.time
            self.history.append({
                "page": page_num,
                "frames": self.frames.copy(),
                "fault": False,
                "victim": None
            })
            return False, None, self.frames.index(page_num)
        
        # Page fault
        self.page_faults += 1
        victim = None
        frame_used = None
        
        # Find empty frame
        if None in self.frames:
            frame_idx = self.frames.index(None)
            self.frames[frame_idx] = page_num
            self.recent_use[page_num] = self.time
            frame_used = frame_idx
        else:
            # Find LRU page
            lru_page = min(
                [p for p in self.frames if p is not None],
                key=lambda p: self.recent_use.get(p, 0)
            )
            victim = lru_page
            victim_idx = self.frames.index(lru_page)
            self.frames[victim_idx] = page_num
            self.recent_use[page_num] = self.time
            frame_used = victim_idx
            self.replacements += 1
        
        self.history.append({
            "page": page_num,
            "frames": self.frames.copy(),
            "fault": True,
            "victim": victim
        })
        
        return True, victim, frame_used
    
    def reset(self):
        """Reset LRU state"""
        self.frames = [None] * self.num_frames
        self.recent_use = {}
        self.time = 0
        self.page_faults = 0
        self.replacements = 0
        self.history = []


class OptimalReplacement(PageReplacementAlgorithm):
    """
    Optimal page replacement (for comparison).
    Replaces the page that won't be used for the longest time in the future.
    Note: This requires future knowledge and is not practical in real systems.
    """
    
    def __init__(self, num_frames: int, reference_string: List[int]):
        super().__init__()
        self.num_frames = num_frames
        self.frames: List[Optional[int]] = [None] * num_frames
        self.reference_string = reference_string
        self.current_index = 0
        self.algorithm_name = "Optimal"
    
    def access_page(self, page_num: int, reference_string: List[int] = None) -> Tuple[bool, Optional[int], Optional[int]]:
        """Access page with Optimal replacement"""
        # Check if page in memory
        if page_num in self.frames:
            self.current_index += 1
            self.history.append({
                "page": page_num,
                "frames": self.frames.copy(),
                "fault": False,
                "victim": None
            })
            return False, None, self.frames.index(page_num)
        
        # Page fault
        self.page_faults += 1
        victim = None
        frame_used = None
        
        # Find empty frame
        if None in self.frames:
            frame_idx = self.frames.index(None)
            self.frames[frame_idx] = page_num
            frame_used = frame_idx
        else:
            # Find page that will be used furthest in future
            future_uses = {}
            for page in self.frames:
                if page is None:
                    continue
                # Find next use of this page
                try:
                    next_use = self.reference_string[self.current_index + 1:].index(page)
                    future_uses[page] = next_use
                except ValueError:
                    # Page not used again - perfect victim
                    future_uses[page] = float('inf')
            
            # Replace page used furthest in future
            victim = max(future_uses, key=future_uses.get)
            victim_idx = self.frames.index(victim)
            self.frames[victim_idx] = page_num
            frame_used = victim_idx
            self.replacements += 1
        
        self.current_index += 1
        
        self.history.append({
            "page": page_num,
            "frames": self.frames.copy(),
            "fault": True,
            "victim": victim
        })
        
        return True, victim, frame_used
    
    def reset(self):
        """Reset Optimal state"""
        self.frames = [None] * self.num_frames
        self.current_index = 0
        self.page_faults = 0
        self.replacements = 0
        self.history = []


def simulate_page_replacement(algorithm: PageReplacementAlgorithm, 
                              reference_string: List[int]) -> Dict:
    """
    Simulate page replacement algorithm on a reference string.
    
    Args:
        algorithm: Page replacement algorithm instance
        reference_string: Sequence of page accesses
        
    Returns:
        Simulation results with metrics and history
    """
    algorithm.reset()
    
    for page in reference_string:
        algorithm.access_page(page, reference_string)
    
    return {
        "algorithm": algorithm.algorithm_name,
        "page_faults": algorithm.page_faults,
        "replacements": algorithm.replacements,
        "fault_rate": algorithm.page_faults / len(reference_string) if reference_string else 0,
        "history": algorithm.history
    }
