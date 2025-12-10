"""
Round Robin Scheduler
Preemptive scheduling with fixed time quantum.
"""

from typing import List, Optional
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from models import Process, ProcessState
from .base_scheduler import BaseScheduler


class RoundRobinScheduler(BaseScheduler):
    """
    Round Robin (RR) scheduler.
    Each process gets a fixed time quantum. After quantum expires, process is preempted
    and moved to end of ready queue.
    """
    
    def __init__(self, time_quantum: int = 4):
        super().__init__()
        self.time_quantum = time_quantum
        self.current_quantum_remaining = 0
        self.algorithm_name = f"Round Robin (Time Quantum = {time_quantum})"
    
    def schedule(self, new_arrivals: List[Process] = None) -> Optional[Process]:
        """
        Select next process in round-robin fashion.
        
        Args:
            new_arrivals: Processes arriving at current time
            
        Returns:
            Next process in queue
        """
        # Add new arrivals to end of ready queue
        if new_arrivals:
            for process in new_arrivals:
                self.add_process(process)
                self._add_explanation(
                    f"Process P{process.pid} arrived (burst: {process.burst_time}), "
                    f"added to ready queue"
                )
        
        # Check if current process exhausted its quantum
        if self.running_process and self.current_quantum_remaining <= 0:
            # Time quantum expired
            if self.running_process.remaining_time > 0:
                # Process not finished, move to end of ready queue
                self._add_explanation(
                    f"Time quantum expired for P{self.running_process.pid}. "
                    f"Remaining time: {self.running_process.remaining_time}. Moving to end of queue."
                )
                
                self._change_state(self.running_process, ProcessState.READY, "Time quantum expired")
                self.ready_queue.append(self.running_process)
                self.running_process = None
        
        # Select next process if none running
        if not self.running_process and self.ready_queue:
            next_process = self.ready_queue.pop(0)
            self.running_process = next_process
            self.current_quantum_remaining = self.time_quantum
            
            self._add_explanation(
                f"Round Robin selected P{next_process.pid} from ready queue. "
                f"Time quantum: {self.time_quantum}"
            )
            
            if len(self.completed_processes) > 0 or len(self.gantt_chart) > 0:
                self.context_switch(None, next_process, "Round Robin scheduling")
            
            return next_process
        
        return self.running_process
    
    def execute_process(self, process: Process, duration: int = 1):
        """Override to track quantum consumption"""
        result = super().execute_process(process, duration)
        self.current_quantum_remaining -= duration
        return result
    
    def run_simulation(self, processes: List[Process]) -> None:
        """
        Run complete Round Robin simulation.
        
        Args:
            processes: List of processes to schedule
        """
        # Sort by arrival
        processes.sort(key=lambda p: (p.arrival_time, p.pid))
        
        self._add_explanation(
            f"Starting Round Robin simulation with {len(processes)} processes, "
            f"time quantum = {self.time_quantum}"
        )
        
        process_index = 0
        idle_time = 0
        
        while process_index < len(processes) or self.running_process or self.ready_queue:
            # New arrivals
            new_arrivals = []
            while process_index < len(processes) and processes[process_index].arrival_time <= self.current_time:
                new_arrivals.append(processes[process_index])
                process_index += 1
            
            # Schedule (may preempt if quantum expired)
            self.schedule(new_arrivals)
            
            if self.running_process:
                # Execute for 1 time unit
                self.execute_process(self.running_process, duration=1)
                
                # Check if process completed
                if self.running_process and self.running_process.remaining_time == 0:
                    self.running_process = None
                    self.current_quantum_remaining = 0
            else:
                # CPU idle
                if process_index < len(processes):
                    next_arrival = processes[process_index].arrival_time
                    idle_duration = next_arrival - self.current_time
                    
                    if idle_duration > 0:
                        self._add_timeline_event("cpu_idle", f"CPU idle for {idle_duration} time units")
                        self._add_explanation("CPU idle, waiting for next process")
                        idle_time += idle_duration
                        self.current_time = next_arrival
        
        self._add_explanation(
            f"Round Robin simulation completed. Total time: {self.current_time}, "
            f"Time quantum: {self.time_quantum}"
        )
