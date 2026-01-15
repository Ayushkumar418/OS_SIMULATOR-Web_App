# CPU Scheduler Module

The CPU Scheduler module provides interactive visualization of process scheduling algorithms, helping understand how operating systems manage CPU time allocation.

## Overview

CPU scheduling is a fundamental operating system concept that determines which process runs on the CPU at any given time. This module visualizes four major scheduling algorithms with real-time Gantt charts and performance metrics.

## Supported Algorithms

### 1. First Come First Serve (FCFS)

**Type:** Non-preemptive

**Concept:** Processes are executed in the order they arrive in the ready queue.

**How it Works:**

1. Processes enter the ready queue in arrival order
2. CPU allocated to the first process in queue
3. Process runs to completion before next starts
4. No preemption - once started, runs until finished

| Advantages | Disadvantages |
|------------|---------------|
| Simple to implement | Poor average waiting time |
| Fair (arrival order) | Convoy effect |
| No starvation | Not suitable for time-sharing |

**Best For:** Batch systems where throughput > response time

---

### 2. Shortest Job First (SJF) / Shortest Remaining Time First (SRTF)

**Type:** Non-preemptive (SJF) or Preemptive (SRTF)

**Concept:** Process with shortest burst time executes first.

**Non-Preemptive (SJF):**

- Sort processes by burst time
- Execute shortest job completely
- No interruption once started

**Preemptive (SRTF):**

- Check if new arrival has shorter remaining time
- Preempt current process if shorter job arrives
- Always runs minimum remaining time process

| Advantages | Disadvantages |
|------------|---------------|
| Optimal average waiting time | Starvation for long processes |
| Good response for short jobs | Requires burst time prediction |
| Adapts to workload (SRTF) | High context switching (SRTF) |

**Best For:** Systems with known job durations

---

### 3. Priority Scheduling

**Type:** Non-preemptive or Preemptive

**Concept:** Each process has a priority; highest priority (lowest number) runs first.

**Non-Preemptive:**

- Highest priority process runs to completion
- If priorities equal, uses FCFS tiebreaker

**Preemptive:**

- Higher priority arrival preempts current process
- CPU always runs highest priority ready process

| Advantages | Disadvantages |
|------------|---------------|
| Important tasks get preference | Starvation of low priority |
| Flexible priority assignment | Priority inversion problem |
| Good for real-time systems | Difficult to set optimal priorities |

**Best For:** Systems with clear task importance hierarchy

---

### 4. Round Robin (RR)

**Type:** Preemptive

**Concept:** Each process gets a fixed time quantum; cycles through all processes.

**How it Works:**

1. Each process gets a time quantum (configurable)
2. Process runs for quantum or until completion
3. If not finished, moves to end of ready queue
4. Next process gets CPU

**Time Quantum Guidelines:**

- **Too Small:** High context switching overhead
- **Too Large:** Behaves like FCFS
- **Optimal:** 80% of processes should finish within one quantum

| Advantages | Disadvantages |
|------------|---------------|
| Fair CPU sharing | Higher avg waiting than SJF |
| Good response time | Context switching overhead |
| No starvation | Performance depends on quantum |

**Best For:** Time-sharing and interactive systems

---

## Features

### Gantt Chart Visualization

Real-time animated Gantt chart showing:

- Process execution timeline
- Process colors and durations
- Time markers

### Performance Metrics

- **Average Waiting Time**: Mean time processes wait in ready queue
- **Average Turnaround Time**: Mean time from arrival to completion
- **Average Response Time**: Mean time from arrival to first execution
- **CPU Utilization**: Percentage of time CPU is busy
- **Throughput**: Processes completed per time unit
- **Context Switches**: Number of process switches

### Comparison Mode

Compare all algorithms side-by-side with the same process set:

- FCFS
- SJF (Non-preemptive)
- SRTF (Preemptive SJF)
- Priority (Non-preemptive)
- Priority (Preemptive)
- Round Robin

Includes algorithm recommendation based on metrics.

### Additional Features

- **Demo Scenarios**: Pre-built example configurations
- **Import/Export**: Save and load process configurations (JSON)
- **Keyboard Shortcuts**: R (run), C (clear), H (help)
- **Step-by-Step Explanations**: Educational view of scheduler decisions
- **Sortable Process Table**: Sort by any metric

---

## API Endpoints

### Run Simulation

```
POST /api/scheduler/run
```

**Request Body:**

```json
{
  "algorithm": "fcfs|sjf|priority|round_robin",
  "processes": [
    {"pid": 1, "arrival_time": 0, "burst_time": 5, "priority": 1}
  ],
  "time_quantum": 4,
  "preemptive": false
}
```

**Response:**

```json
{
  "gantt_chart": [...],
  "completed_processes": [...],
  "metrics": {...},
  "explanations": [...]
}
```

### Compare Algorithms

```
POST /api/scheduler/compare
```

### List Algorithms

```
GET /api/scheduler/algorithms
```

---

## Code Structure

### Frontend

- `pages/CPUScheduler.jsx` - Main component
- `pages/CPUScheduler.css` - Styles
- `components/ProcessTimeline.jsx` - Gantt chart
- `components/MetricsPanel.jsx` - Performance metrics
- `components/ProcessInput.jsx` - Process form
- `components/ComparisonPanel.jsx` - Algorithm comparison
- `components/ExplanationPanel.jsx` - Step explanations

### Backend

- `schedulers/base_scheduler.py` - Abstract base class
- `schedulers/fcfs.py` - FCFS implementation
- `schedulers/sjf.py` - SJF/SRTF implementation
- `schedulers/priority.py` - Priority scheduling
- `schedulers/round_robin.py` - Round Robin implementation
- `routes/scheduler_routes.py` - API endpoints

---

## Educational Use

### Learning Objectives

1. Understand how different algorithms prioritize processes
2. Compare algorithm trade-offs (waiting time vs. response time)
3. Visualize process state transitions
4. Analyze impact of preemption and time quantum

### Suggested Exercises

1. Compare FCFS vs SJF with varying arrival times
2. Observe convoy effect with one long and multiple short processes
3. Test Round Robin with different quantum values
4. Explore priority inversion scenarios
