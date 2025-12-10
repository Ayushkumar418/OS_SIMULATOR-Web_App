"""
Priority Scheduler
Processes are scheduled based on priority (lower number = higher priority).
Can be preemptive or non-preemptive.
"""

from typing import List, Optional
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from models import Process, ProcessState
from .base_scheduler import BaseScheduler


class PriorityScheduler(BaseScheduler):
    """
    Priority-based scheduler.
    Processes with higher priority (lower priority number) are executed first.
    """
    
    def __init__(self, preemptive: bool = False):
        super().__init__()
        self.preemptive = preemptive
        self.algorithm_name = "Preemptive Priority Scheduling" if preemptive else "Non-Preemptive Priority Scheduling"
    
    def schedule(self, new_arrivals: List[Process] = None) -> Optional[Process]:
        """
        Select process with highest priority (lowest priority number).
        
        Args:
            new_arrivals: Processes arriving at current time
            
        Returns:
            Process with highest priority
        """
        # Add new arrivals
        if new_arrivals:
            for process in new_arrivals:
                self.add_process(process)
                self._add_explanation(
                    f"Process P{process.pid} arrived with priority {process.priority} "
                    f"(burst time: {process.burst_time})"
                )
        
        # Sort ready queue by priority (lower number = higher priority)
        if self.ready_queue:
            self.ready_queue.sort(key=lambda p: (p.priority, p.arrival_time, p.pid))
        
        # Preemptive: check if we should preempt
        if self.preemptive and self.running_process and self.ready_queue:
            highest_priority = self.ready_queue[0]
            
            # Preempt if higher priority process arrived
            if highest_priority.priority < self.running_process.priority:
                self._add_explanation(
                    f"Priority: Preempting P{self.running_process.pid} (priority {self.running_process.priority}) "
                    f"for P{highest_priority.pid} (priority {highest_priority.priority})"
                )
                
                # Move running back to ready
                self._change_state(self.running_process, ProcessState.READY, "Preempted by higher priority process")
                self.ready_queue.append(self.running_process)
                self.ready_queue.sort(key=lambda p: (p.priority, p.arrival_time, p.pid))
                
                # Schedule higher priority
                next_process = self.ready_queue.pop(0)
                self.context_switch(self.running_process, next_process, "Preemption (higher priority)")
                self.running_process = next_process
                
                return next_process
        
        # Select highest priority if no process running
        if not self.running_process and self.ready_queue:
            next_process = self.ready_queue.pop(0)
            self.running_process = next_process
            
            self._add_explanation(
                f"Priority scheduler selected P{next_process.pid} "
                f"(highest priority in queue: {next_process.priority})"
            )
            
            if len(self.completed_processes) > 0 or len(self.gantt_chart) > 0:
                self.context_switch(None, next_process, "Priority scheduling")
            
            return next_process
        
        return self.running_process
    
    def run_simulation(self, processes: List[Process]) -> None:
        """
        Run complete priority scheduling simulation.
        
        Args:
            processes: List of processes to schedule
        """
        # Sort by arrival
        processes.sort(key=lambda p: (p.arrival_time, p.pid))
        
        self._add_explanation(
            f"Starting {self.algorithm_name} with {len(processes)} processes"
        )
        
        process_index = 0
        idle_time = 0
        
        while process_index < len(processes) or self.running_process or self.ready_queue:
            # New arrivals
            new_arrivals = []
            while process_index < len(processes) and processes[process_index].arrival_time <= self.current_time:
                new_arrivals.append(processes[process_index])
                process_index += 1
            
            # Schedule
            self.schedule(new_arrivals)
            
            if self.running_process:
                # Execute
                self.execute_process(self.running_process, duration=1)
                
                if self.running_process and self.running_process.remaining_time == 0:
                    self.running_process = None
            else:
                # Idle
                if process_index < len(processes):
                    next_arrival = processes[process_index].arrival_time
                    idle_duration = next_arrival - self.current_time
                    
                    if idle_duration > 0:
                        self._add_timeline_event("cpu_idle", f"CPU idle for {idle_duration} time units")
                        self._add_explanation("CPU idle, waiting for next process")
                        idle_time += idle_duration
                        self.current_time = next_arrival
        
        self._add_explanation(
            f"{self.algorithm_name} completed. Total time: {self.current_time}"
        )
