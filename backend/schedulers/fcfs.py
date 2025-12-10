"""
First Come First Serve (FCFS) Scheduler
Non-preemptive scheduling algorithm that processes jobs in order of arrival.
"""

from typing import List, Optional
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from models import Process
from .base_scheduler import BaseScheduler


class FCFSScheduler(BaseScheduler):
    """
    First Come First Serve (FCFS) scheduler.
    Processes are executed in the order they arrive (FIFO).
    Non-preemptive: once a process starts, it runs to completion.
    """
    
    def __init__(self):
        super().__init__()
        self.algorithm_name = "FCFS (First Come First Serve)"
    
    def schedule(self, new_arrivals: List[Process] = None) -> Optional[Process]:
        """
        Select next process based on arrival order (FIFO).
        
        Args:
            new_arrivals: Processes arriving at current time
            
        Returns:
            First process in ready queue, or None if queue is empty
        """
        # Add new arrivals to ready queue
        if new_arrivals:
            for process in new_arrivals:
                self.add_process(process)
                self._add_explanation(
                    f"Process P{process.pid} arrived with burst time {process.burst_time}. "
                    f"Added to end of ready queue."
                )
        
        # If no process is running and ready queue has processes, select the first one
        if not self.running_process and self.ready_queue:
            next_process = self.ready_queue.pop(0)
            self.running_process = next_process
            
            self._add_explanation(
                f"FCFS selected P{next_process.pid} (first in queue, arrival time: {next_process.arrival_time})"
            )
            
            # Perform context switch if needed
            if len(self.completed_processes) > 0 or len(self.gantt_chart) > 0:
                self.context_switch(None, next_process, "FCFS scheduling")
            
            return next_process
        
        return self.running_process
    
    def run_simulation(self, processes: List[Process]) -> None:
        """
        Run complete FCFS simulation.
        
        Args:
            processes: List of processes to schedule
        """
        # Sort processes by arrival time
        processes.sort(key=lambda p: (p.arrival_time, p.pid))
        
        self._add_explanation(
            f"Starting FCFS simulation with {len(processes)} processes"
        )
        
        process_index = 0
        idle_time = 0
        
        while process_index < len(processes) or self.running_process or self.ready_queue:
            # Check for new arrivals at current time
            new_arrivals = []
            while process_index < len(processes) and processes[process_index].arrival_time <= self.current_time:
                new_arrivals.append(processes[process_index])
                process_index += 1
            
            # Schedule next process
            self.schedule(new_arrivals)
            
            if self.running_process:
                # Execute current process for 1 time unit
                self.execute_process(self.running_process, duration=1)
                
                # If process completed, clear running process
                if self.running_process and self.running_process.remaining_time == 0:
                    self.running_process = None
            else:
                # CPU is idle
                if process_index < len(processes):
                    # Fast forward to next arrival if CPU is idle
                    next_arrival = processes[process_index].arrival_time
                    idle_duration = next_arrival - self.current_time
                    
                    if idle_duration > 0:
                        self._add_timeline_event(
                            "cpu_idle",
                            f"CPU idle for {idle_duration} time units"
                        )
                        self._add_explanation(f"CPU idle, waiting for next process arrival")
                        
                        idle_time += idle_duration
                        self.current_time = next_arrival
        
        self._add_explanation(
            f"FCFS simulation completed. Total time: {self.current_time}, "
            f"Idle time: {idle_time}"
        )
