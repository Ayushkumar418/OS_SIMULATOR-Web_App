"""
CPU Scheduler API routes.
"""

from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
import copy

from models import (
    Process, SimulationRequest, SimulationResponse,
    SimulationState, SchedulingAlgorithm, SchedulerMetrics
)
from schedulers import (
    FCFSScheduler, SJFScheduler, PriorityScheduler, RoundRobinScheduler
)

router = APIRouter()

# Global state for active simulations (in production, use proper state management)
active_simulations = {}


class RunRequest(BaseModel):
    algorithm: SchedulingAlgorithm
    processes: List[Process]
    time_quantum: int = 4
    preemptive: bool = False


@router.post("/run", response_model=dict)
async def run_simulation(request: RunRequest):
    """
    Run a complete CPU scheduling simulation.
    """
    try:
        # Create deep copies of processes
        processes = [copy.deepcopy(p) for p in request.processes]
        
        # Select scheduler
        if request.algorithm == SchedulingAlgorithm.FCFS:
            scheduler = FCFSScheduler()
        elif request.algorithm == SchedulingAlgorithm.SJF:
            scheduler = SJFScheduler(preemptive=request.preemptive)
        elif request.algorithm == SchedulingAlgorithm.PRIORITY:
            scheduler = PriorityScheduler(preemptive=request.preemptive)
        elif request.algorithm == SchedulingAlgorithm.ROUND_ROBIN:
            scheduler = RoundRobinScheduler(time_quantum=request.time_quantum)
        else:
            raise HTTPException(status_code=400, detail="Invalid algorithm")
        
        # Run simulation
        scheduler.run_simulation(processes)
        
        # Calculate metrics
        metrics = scheduler.calculate_metrics()
        
        # Prepare response
        return {
            "success": True,
            "algorithm": request.algorithm.value,
            "current_time": scheduler.current_time,
            "completed_processes": [p.model_dump() for p in scheduler.completed_processes],
            "gantt_chart": scheduler.gantt_chart,
            "timeline": [e.model_dump() for e in scheduler.timeline],
            "state_changes": [s.model_dump() for s in scheduler.state_changes],
            "context_switches": [c.model_dump() for c in scheduler.context_switches],
            "metrics": metrics.model_dump(),
            "explanations": scheduler.explanations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def compare_algorithms(processes: List[Process]):
    """
    Compare multiple scheduling algorithms on the same process set.
    """
    try:
        results = {}
        
        algorithms = [
            ("FCFS", FCFSScheduler()),
            ("SJF", SJFScheduler(preemptive=False)),
            ("SRTF", SJFScheduler(preemptive=True)),
            ("Priority", PriorityScheduler(preemptive=False)),
            ("Round Robin", RoundRobinScheduler(time_quantum=4))
        ]
        
        for name, scheduler in algorithms:
            # Create deep copies
            procs = [copy.deepcopy(p) for p in processes]
            
            # Run simulation
            scheduler.run_simulation(procs)
            
            # Get metrics
            metrics = scheduler.calculate_metrics()
            
            results[name] = {
                "metrics": metrics.model_dump(),
                "total_time": scheduler.current_time,
                "gantt_chart": scheduler.gantt_chart
            }
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/algorithms")
async def list_algorithms():
    """List available scheduling algorithms with descriptions."""
    return {
        "algorithms": [
            {
                "name": "FCFS",
                "full_name": "First Come First Serve",
                "description": "Non-preemptive. Processes are executed in order of arrival (FIFO).",
                "characteristics": [
                    "Simple to implement",
                    "Non-preemptive",
                    "Can cause convoy effect",
                    "Poor average waiting time"
                ]
            },
            {
                "name": "SJF",
                "full_name": "Shortest Job First",
                "description": "Non-preemptive. Selects process with shortest burst time.",
                "characteristics": [
                    "Optimal average waiting time",
                    "Non-preemptive version",
                    "Can cause starvation",
                    "Requires knowledge of burst time"
                ]
            },
            {
                "name": "SRTF",
                "full_name": "Shortest Remaining Time First",
                "description": "Preemptive version of SJF. Selects process with shortest remaining time.",
                "characteristics": [
                    "Optimal average waiting time",
                    "Preemptive",
                    "More context switches",
                    "Can cause starvation"
                ]
            },
            {
                "name": "Priority",
                "full_name": "Priority Scheduling",
                "description": "Processes scheduled based on priority (lower number = higher priority).",
                "characteristics": [
                    "Can be preemptive or non-preemptive",
                    "Flexible priority assignment",
                    "Can cause starvation",
                    "Priority inversion possible"
                ]
            },
            {
                "name": "Round Robin",
                "full_name": "Round Robin",
                "description": "Preemptive with fixed time quantum. Each process gets equal CPU time.",
                "characteristics": [
                    "Fair allocation",
                    "Preemptive",
                    "Good response time",
                    "Performance depends on quantum size"
                ]
            }
        ]
    }
