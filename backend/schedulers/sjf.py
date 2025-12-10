"""
Shortest Job First (SJF) Scheduler
Can be preemptive (SRTF) or non-preemptive.
"""

from typing import List, Optional
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from models import Process, ProcessState
from .base_scheduler import BaseScheduler


class SJFScheduler(BaseScheduler):
    """
    Shortest Job First (SJF) scheduler.
    Selects process with shortest burst time (or shortest remaining time if preemptive).
    """
    
    def __init__(self, preemptive: bool = False):
        super().__init__()
        self.preemptive = preemptive
        self.algorithm_name = "SRTF (Shortest Remaining Time First)" if preemptive else "SJF (Shortest Job First)"
    
    def schedule(self, new_arrivals: List[Process] = None) -> Optional[Process]:
        """
        Select process with shortest (remaining) burst time.
        
        Args:
            new_arrivals: Processes arriving at current time
            
        Returns:
            Process with shortest burst/remaining time
        """
        # Add new arrivals to ready queue
        if new_arrivals:
            for process in new_arrivals:
                self.add_process(process)
                self._add_explanation(
                    f"Process P{process.pid} arrived with burst time {process.burst_time}"
                )
        
        # Sort ready queue by remaining time (or burst time for non-preemptive)
        if self.ready_queue:
            self.ready_queue.sort(key=lambda p: (p.remaining_time, p.pid))
        
        # Preemptive: check if we should preempt current process
        if self.preemptive and self.running_process and self.ready_queue:
            shortest_in_queue = self.ready_queue[0]
            
            if shortest_in_queue.remaining_time < self.running_process.remaining_time:
                # Preempt current process
                self._add_explanation(
                    f"SRTF: Preempting P{self.running_process.pid} "
                    f"(remaining: {self.running_process.remaining_time}) "
                    f"for P{shortest_in_queue.pid} (remaining: {shortest_in_queue.remaining_time})"
                )
                
                # Move running process back to ready queue
                self._change_state(self.running_process, ProcessState.READY, "Preempted by shorter job")
                self.ready_queue.append(self.running_process)
                self.ready_queue.sort(key=lambda p: (p.remaining_time, p.pid))
                
                # Get shortest job
                next_process = self.ready_queue.pop(0)
                self.context_switch(self.running_process, next_process, "Preemption (shorter job arrived)")
                self.running_process = next_process
                
                return next_process
        
        # If no process running, select shortest from ready queue
        if not self.running_process and self.ready_queue:
            next_process = self.ready_queue.pop(0)
            self.running_process = next_process
            
            self._add_explanation(
                f"{self.algorithm_name} selected P{next_process.pid} "
                f"(shortest {'remaining time' if self.preemptive else 'burst time'}: {next_process.remaining_time})"
            )
            
            if len(self.completed_processes) > 0 or len(self.gantt_chart) > 0:
                self.context_switch(None, next_process, "SJF scheduling")
            
            return next_process
        
        return self.running_process
    
    def run_simulation(self, processes: List[Process]) -> None:
        """
        Run complete SJF/SRTF simulation.
        
        Args:
            processes: List of processes to schedule
        """
        # Sort by arrival time
        processes.sort(key=lambda p: (p.arrival_time, p.pid))
        
        self._add_explanation(
            f"Starting {self.algorithm_name} simulation with {len(processes)} processes"
        )
        
        process_index = 0
        idle_time = 0
        
        while process_index < len(processes) or self.running_process or self.ready_queue:
            # Check for new arrivals
            new_arrivals = []
            while process_index < len(processes) and processes[process_index].arrival_time <= self.current_time:
                new_arrivals.append(processes[process_index])
                process_index += 1
            
            # Schedule (may cause preemption if preemptive)
            self.schedule(new_arrivals)
            
            if self.running_process:
                # Execute for 1 time unit
                self.execute_process(self.running_process, duration=1)
                
                if self.running_process and self.running_process.remaining_time == 0:
                    self.running_process = None
            else:
                # CPU idle
                if process_index < len(processes):
                    next_arrival = processes[process_index].arrival_time
                    idle_duration = next_arrival - self.current_time
                    
                    if idle_duration > 0:
                        self._add_timeline_event("cpu_idle", f"CPU idle for {idle_duration} time units")
                        self._add_explanation(f"CPU idle, waiting for next process")
                        idle_time += idle_duration
                        self.current_time = next_arrival
        
        self._add_explanation(
            f"{self.algorithm_name} simulation completed. Total time: {self.current_time}"
        )
