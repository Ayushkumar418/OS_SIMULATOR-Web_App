"""
Data models for OS Simulator using Pydantic for validation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class ProcessState(str, Enum):
    """Process lifecycle states"""
    NEW = "NEW"
    READY = "READY"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    TERMINATED = "TERMINATED"


class SchedulingAlgorithm(str, Enum):
    """Supported CPU scheduling algorithms"""
    FCFS = "fcfs"
    SJF = "sjf"
    PRIORITY = "priority"
    ROUND_ROBIN = "round_robin"


class Process(BaseModel):
    """Represents a process in the system"""
    pid: int = Field(..., description="Process ID")
    arrival_time: int = Field(0, ge=0, description="Time when process arrives")
    burst_time: int = Field(..., gt=0, description="Total CPU time required")
    priority: int = Field(0, ge=0, description="Priority (lower number = higher priority)")
    memory_required: int = Field(0, ge=0, description="Memory pages required")
    
    # Runtime state
    state: ProcessState = ProcessState.NEW
    remaining_time: Optional[int] = None
    wait_time: int = 0
    turnaround_time: int = 0
    response_time: Optional[int] = None
    start_time: Optional[int] = None
    completion_time: Optional[int] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if self.remaining_time is None:
            self.remaining_time = self.burst_time


class ProcessStateChange(BaseModel):
    """Represents a state change event for visualization"""
    time: int
    pid: int
    from_state: ProcessState
    to_state: ProcessState
    reason: str


class TimelineEvent(BaseModel):
    """Event in the execution timeline"""
    time: int
    pid: Optional[int]
    event_type: str  # "process_start", "process_end", "context_switch", "page_fault", etc.
    description: str


class SchedulerMetrics(BaseModel):
    """Performance metrics for scheduler"""
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float
    cpu_utilization: float
    throughput: float
    total_context_switches: int


class MemoryPage(BaseModel):
    """Represents a page in virtual memory"""
    page_number: int
    frame_number: Optional[int] = None
    valid: bool = False
    referenced: bool = False
    modified: bool = False
    pid: Optional[int] = None


class PageTableEntry(BaseModel):
    """Entry in a process's page table"""
    page_number: int
    frame_number: Optional[int] = None
    valid: bool = False
    referenced: bool = False
    modified: bool = False


class MemoryFrame(BaseModel):
    """Represents a physical memory frame"""
    frame_number: int
    occupied: bool = False
    pid: Optional[int] = None
    page_number: Optional[int] = None


class PageFaultEvent(BaseModel):
    """Records a page fault occurrence"""
    time: int
    pid: int
    page_number: int
    frame_allocated: Optional[int] = None
    page_replaced: Optional[int] = None
    replacement_algorithm: str


class FileSystemEntry(BaseModel):
    """Represents a file or directory"""
    name: str
    type: str  # "file" or "directory"
    size: int = 0
    blocks: List[int] = Field(default_factory=list)
    created_at: int = 0
    modified_at: int = 0
    parent: Optional[str] = None
    inode: int = 0


class SimulationRequest(BaseModel):
    """Request to run a simulation"""
    algorithm: SchedulingAlgorithm
    processes: List[Process]
    time_quantum: Optional[int] = 4  # For Round Robin
    memory_size: int = Field(64, description="Total memory frames")
    page_size: int = Field(4, description="Size of each page in KB")
    page_replacement: str = Field("fifo", description="Page replacement algorithm")


class SimulationState(BaseModel):
    """Current state of the simulation"""
    current_time: int = 0
    running_process: Optional[Process] = None
    ready_queue: List[Process] = Field(default_factory=list)
    waiting_queue: List[Process] = Field(default_factory=list)
    completed_processes: List[Process] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    state_changes: List[ProcessStateChange] = Field(default_factory=list)
    metrics: Optional[SchedulerMetrics] = None
    page_faults: List[PageFaultEvent] = Field(default_factory=list)
    context_switch_count: int = 0


class SimulationResponse(BaseModel):
    """Response containing simulation results"""
    state: SimulationState
    timeline: List[TimelineEvent]
    metrics: SchedulerMetrics
    gantt_chart: List[Dict[str, Any]]  # For visualization
    explanation: List[str]  # Step-by-step explanations


class SystemCall(BaseModel):
    """Represents a system call"""
    call_type: str  # "fork", "exec", "read", "write", "exit"
    pid: int
    parameters: Dict[str, Any] = Field(default_factory=dict)
    time: int
    
    
class ContextSwitchEvent(BaseModel):
    """Details of a context switch"""
    time: int
    from_pid: Optional[int]
    to_pid: int
    reason: str
    steps: List[str] = Field(default_factory=list)
