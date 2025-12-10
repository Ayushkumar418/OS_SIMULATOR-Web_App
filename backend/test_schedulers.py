"""
Test script for CPU schedulers to verify accuracy
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from models import Process
from schedulers import FCFSScheduler, SJFScheduler, RoundRobinScheduler
import copy

def test_fcfs():
    """Test FCFS with known expected values"""
    print("\n=== Testing FCFS ===")
    
    processes = [
        Process(pid=1, arrival_time=0, burst_time=5, priority=0, memory_required=0),
        Process(pid=2, arrival_time=1, burst_time=3, priority=0, memory_required=0),
        Process(pid=3, arrival_time=2, burst_time=8, priority=0, memory_required=0)
    ]
    
    scheduler = FCFSScheduler()
    scheduler.run_simulation(copy.deepcopy(processes))
    metrics = scheduler.calculate_metrics()
    
    print(f"Total Time: {scheduler.current_time}")
    print(f"Average Waiting Time: {metrics.average_waiting_time}")
    print(f"Average Turnaround Time: {metrics.average_turnaround_time}")
    print(f"CPU Utilization: {metrics.cpu_utilization}%")
    
    print("\nCompleted Processes:")
    for p in scheduler.completed_processes:
        print(f"  P{p.pid}: Wait={p.wait_time}, Turnaround={p.turnaround_time}, Response={p.response_time}")
    
    print("\nGantt Chart:")
    for entry in scheduler.gantt_chart:
        print(f"  P{entry['pid']}: {entry['start']}-{entry['end']}")
    
    # Expected values for FCFS:
    # P1: 0-5 (wait=0, turnaround=5, response=0)
    # P2: 5-8 (wait=4, turnaround=7, response=4)
    # P3: 8-16 (wait=6, turnaround=14, response=6)
    # Avg Wait = (0+4+6)/3 = 3.33
    # Avg Turnaround = (5+7+14)/3 = 8.67
    
    print(f"\n✓ Expected Avg Wait: 3.33, Got: {metrics.average_waiting_time}")
    print(f"✓ Expected Avg Turnaround: 8.67, Got: {metrics.average_turnaround_time}")
    
    return abs(metrics.average_waiting_time - 3.33) < 0.1

def test_sjf():
    """Test SJF with known expected values"""
    print("\n=== Testing SJF (Non-Preemptive) ===")
    
    processes = [
        Process(pid=1, arrival_time=0, burst_time=7, priority=0, memory_required=0),
        Process(pid=2, arrival_time=2, burst_time=4, priority=0, memory_required=0),
        Process(pid=3, arrival_time=4, burst_time=1, priority=0, memory_required=0),
        Process(pid=4, arrival_time=5, burst_time=4, priority=0, memory_required=0)
    ]
    
    scheduler = SJFScheduler(preemptive=False)
    scheduler.run_simulation(copy.deepcopy(processes))
    metrics = scheduler.calculate_metrics()
    
    print(f"Total Time: {scheduler.current_time}")
    print(f"Average Waiting Time: {metrics.average_waiting_time}")
    print(f"Average Turnaround Time: {metrics.average_turnaround_time}")
    
    print("\nCompleted Processes:")
    for p in scheduler.completed_processes:
        print(f"  P{p.pid}: Wait={p.wait_time}, Turnaround={p.turnaround_time}")
    
    print("\nGantt Chart:")
    for entry in scheduler.gantt_chart:
        print(f"  P{entry['pid']}: {entry['start']}-{entry['end']}")
    
    return True

def test_round_robin():
    """Test Round Robin with time quantum = 4"""
    print("\n=== Testing Round Robin (Quantum=4) ===")
    
    processes = [
        Process(pid=1, arrival_time=0, burst_time=10, priority=0, memory_required=0),
        Process(pid=2, arrival_time=1, burst_time=5, priority=0, memory_required=0),
        Process(pid=3, arrival_time=2, burst_time=8, priority=0, memory_required=0)
    ]
    
    scheduler = RoundRobinScheduler(time_quantum=4)
    scheduler.run_simulation(copy.deepcopy(processes))
    metrics = scheduler.calculate_metrics()
    
    print(f"Total Time: {scheduler.current_time}")
    print(f"Average Waiting Time: {metrics.average_waiting_time}")
    print(f"Average Turnaround Time: {metrics.average_turnaround_time}")
    print(f"Context Switches: {metrics.total_context_switches}")
    
    print("\nCompleted Processes:")
    for p in scheduler.completed_processes:
        print(f"  P{p.pid}: Wait={p.wait_time}, Turnaround={p.turnaround_time}")
    
    print("\nGantt Chart:")
    for entry in scheduler.gantt_chart:
        print(f"  P{entry['pid']}: {entry['start']}-{entry['end']}")
    
    return True

if __name__ == "__main__":
    print("=== CPU Scheduler Accuracy Tests ===\n")
    
    fcfs_pass = test_fcfs()
    sjf_pass = test_sjf()
    rr_pass = test_round_robin()
    
    print("\n" + "="*50)
    print("Test Results:")
    print(f"  FCFS: {'✓ PASS' if fcfs_pass else '✗ FAIL'}")
    print(f"  SJF:  {'✓ PASS' if sjf_pass else '✗ FAIL'}")
    print(f"  RR:   {'✓ PASS' if rr_pass else '✗ FAIL'}")
    print("="*50)
