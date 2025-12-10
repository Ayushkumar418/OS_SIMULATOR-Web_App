# CPU Scheduler Fix Guide

## Issues Found & Fixes Applied

### Problem 1: Process State String vs Enum

The `_change_state` method was using string "READY" instead of ProcessState.READY enum.

### Problem 2: Import Path Issues

Fixed sys.path configuration in all scheduler files.

### Problem 3: Deep Copy in API

The API route was creating deep copies which might lose state.

## Verified Calculations

### FCFS Example

**Input:**

- P1: arrival=0, burst=5
- P2: arrival=1, burst=3
- P3: arrival=2, burst=8

**Expected Execution:**

- P1: runs 0→5 (wait=0, turnaround=5)
- P2: runs 5→8 (wait=4, turnaround=7)
- P3: runs 8→16 (wait=6, turnaround=14)

**Metrics:**

- Avg Waiting Time: (0+4+6)/3 = **3.33**
- Avg Turnaround: (5+7+14)/3 = **8.67**
- CPU Util: 16/16 = **100%**

### Round Robin (quantum=4) Example

**Input:**

- P1: arrival=0, burst=10
- P2: arrival=1, burst=5
- P3: arrival=2, burst=8

**Expected Execution:**

- P1: 0→4 (4 done, 6 remaining)
- P2: 4→8 (4 done, 1 remaining)
- P3: 8→12 (4 done, 4 remaining)
- P1: 12→16 (4 done, 2 remaining)
- P2: 16→17 (1 done, complete)
- P3: 17→21 (4 done, complete)
- P1: 21→23 (2 done, complete)

### SJF Example

**Input:**

- P1: arrival=0, burst=7
- P2: arrival=2, burst=4
- P3: arrival=4, burst=1
- P4: arrival=5, burst=4

**Expected Non-Preemptive:**

- P1: 0→7
- P3: 7→8 (shortest at time 7)
- P2: 8→12
- P4: 12→16

## Testing

Run backend test:

```bash
cd backend
python test_schedulers.py
```

Should show accurate calculations matching expected values above.
