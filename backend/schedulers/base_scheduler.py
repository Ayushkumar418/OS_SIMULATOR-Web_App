"""
Base scheduler class providing common interface and utilities for all scheduling algorithms.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from models import (
    Process, ProcessState, ProcessStateChange, 
    TimelineEvent, SchedulerMetrics, ContextSwitchEvent
)
import copy


class BaseScheduler(ABC):
    """Abstract base class for all CPU schedulers"""
    
    def __init__(self):
        self.current_time = 0
        self.ready_queue: List[Process] = []
        self.waiting_queue: List[Process] = []
        self.completed_processes: List[Process] = []
        self.running_process: Optional[Process] = None
        self.timeline: List[TimelineEvent] = []
        self.state_changes: List[ProcessStateChange] = []
        self.context_switches: List[ContextSwitchEvent] = []
        self.gantt_chart: List[Dict[str, Any]] = []
        self.explanations: List[str] = []
        
    @abstractmethod
    def schedule(self, new_arrivals: List[Process] = None) -> Optional[Process]:
        """
        Select the next process to run based on the algorithm.
        
        Args:
            new_arrivals: Processes arriving at current time
            
        Returns:
            Process to run next, or None if no process available
        """
        pass
    
    def add_process(self, process: Process):
        """Add a new process to the ready queue"""
        process.state = ProcessState.READY
        self.ready_queue.append(process)
        
        self._record_state_change(
            process.pid,
            ProcessState.NEW,
            ProcessState.READY,
            f"Process P{process.pid} arrived and added to ready queue"
        )
        
        self._add_timeline_event(
            "process_arrival",
            f"Process P{process.pid} arrived (burst={process.burst_time})"
        )
    
    def context_switch(self, from_process: Optional[Process], to_process: Process, reason: str):
        """Perform a context switch"""
        steps = [
            "Save state of current process (registers, program counter)",
            "Update process control block (PCB)",
            "Select next process from ready queue",
            "Load state of new process from its PCB",
            "Update CPU registers and program counter",
            "Resume execution of new process"
        ]
        
        event = ContextSwitchEvent(
            time=self.current_time,
            from_pid=from_process.pid if from_process else None,
            to_pid=to_process.pid,
            reason=reason,
            steps=steps
        )
        self.context_switches.append(event)
        
        self._add_timeline_event(
            "context_switch",
            f"Context switch: P{from_process.pid if from_process else 'None'} → P{to_process.pid} ({reason})"
        )
    
    def execute_process(self, process: Process, duration: int = 1):
        """Execute a process for specified duration"""
        if process.state != ProcessState.RUNNING:
            # Set to running if not already
            self._change_state(process, ProcessState.RUNNING, "Selected by scheduler")
            
            # Record start time and response time
            if process.start_time is None:
                process.start_time = self.current_time
                process.response_time = self.current_time - process.arrival_time
        
        # Execute for duration
        actual_duration = min(duration, process.remaining_time)
        process.remaining_time -= actual_duration
        
        # Update gantt chart
        self.gantt_chart.append({
            "pid": process.pid,
            "start": self.current_time,
            "end": self.current_time + actual_duration,
            "duration": actual_duration
        })
        
        self.current_time += actual_duration
        
        # Check if process completed
        if process.remaining_time == 0:
            self._complete_process(process)
        
        return actual_duration
    
    def _complete_process(self, process: Process):
        """Mark a process as completed"""
        process.completion_time = self.current_time
        process.turnaround_time = process.completion_time - process.arrival_time
        process.wait_time = process.turnaround_time - process.burst_time
        
        self._change_state(process, ProcessState.TERMINATED, "Process completed execution")
        self.completed_processes.append(process)
        
        self._add_explanation(
            f"Process P{process.pid} completed. "
            f"Turnaround time: {process.turnaround_time}, "
            f"Waiting time: {process.wait_time}"
        )
    
    def _change_state(self, process: Process, new_state: ProcessState, reason: str):
        """Change process state and record the transition"""
        old_state = process.state
        process.state = new_state
        self._record_state_change(process.pid, old_state, new_state, reason)
    
    def _record_state_change(self, pid: int, from_state: ProcessState, 
                            to_state: ProcessState, reason: str):
        """Record a state transition event"""
        change = ProcessStateChange(
            time=self.current_time,
            pid=pid,
            from_state=from_state,
            to_state=to_state,
            reason=reason
        )
        self.state_changes.append(change)
    
    def _add_timeline_event(self, event_type: str, description: str, pid: Optional[int] = None):
        """Add an event to the timeline"""
        event = TimelineEvent(
            time=self.current_time,
            pid=pid,
            event_type=event_type,
            description=description
        )
        self.timeline.append(event)
    
    def _add_explanation(self, text: str):
        """Add educational explanation"""
        self.explanations.append(f"[t={self.current_time}] {text}")
    
    def calculate_metrics(self) -> SchedulerMetrics:
        """Calculate performance metrics"""
        if not self.completed_processes:
            return SchedulerMetrics(
                average_waiting_time=0,
                average_turnaround_time=0,
                average_response_time=0,
                cpu_utilization=0,
                throughput=0,
                total_context_switches=0
            )
        
        n = len(self.completed_processes)
        
        avg_wait = sum(p.wait_time for p in self.completed_processes) / n
        avg_turnaround = sum(p.turnaround_time for p in self.completed_processes) / n
        avg_response = sum(p.response_time for p in self.completed_processes if p.response_time is not None) / n
        
        # CPU utilization: (total burst time) / (total time)
        total_burst = sum(p.burst_time for p in self.completed_processes)
        cpu_util = (total_burst / self.current_time * 100) if self.current_time > 0 else 0
        
        # Throughput: processes per unit time
        throughput = n / self.current_time if self.current_time > 0 else 0
        
        return SchedulerMetrics(
            average_waiting_time=round(avg_wait, 2),
            average_turnaround_time=round(avg_turnaround, 2),
            average_response_time=round(avg_response, 2),
            cpu_utilization=round(cpu_util, 2),
            throughput=round(throughput, 4),
            total_context_switches=len(self.context_switches)
        )
    
    def get_state(self) -> Dict[str, Any]:
        """Get current simulation state"""
        return {
            "current_time": self.current_time,
            "running_process": self.running_process,
            "ready_queue": [p.model_dump() for p in self.ready_queue],
            "waiting_queue": [p.model_dump() for p in self.waiting_queue],
            "completed_processes": [p.model_dump() for p in self.completed_processes],
            "timeline": [e.model_dump() for e in self.timeline],
            "state_changes": [s.model_dump() for s in self.state_changes],
            "context_switches": [c.model_dump() for c in self.context_switches]
        }
