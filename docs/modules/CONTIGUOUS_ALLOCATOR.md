# Contiguous Memory Allocator Module

The Contiguous Allocator demonstrates how operating systems allocate contiguous blocks of memory to processes using various allocation algorithms.

## Overview

In contiguous memory allocation, each process occupies a single continuous block of memory. This module visualizes the allocation/deallocation process and compares different placement strategies.

## Allocation Algorithms

### First Fit

- Scans from beginning, uses first adequate hole
- **Pros**: Fast, simple
- **Cons**: Fragmentation at start
- **Complexity**: O(n)

### Best Fit

- Finds smallest hole that fits
- **Pros**: Minimizes wasted space
- **Cons**: Creates tiny unusable fragments
- **Complexity**: O(n)

### Worst Fit

- Uses largest available hole
- **Pros**: Leaves larger remaining holes
- **Cons**: Wastes large blocks quickly
- **Complexity**: O(n)

### Next Fit

- Like First Fit, but starts from last allocation
- **Pros**: Distributes evenly
- **Cons**: May miss better earlier holes
- **Complexity**: O(n)

---

## Features

### Memory Visualization

- Visual memory map with blocks
- Color-coded processes
- Free space indicators
- ASCII diagram mode

### Process Management

- Allocate with custom size
- Deallocate by clicking blocks
- Auto-increment process IDs
- Duplicate detection

### Memory Compaction

- Move all allocated blocks together
- Eliminate all holes
- Single click operation

### Algorithm Comparison

Compare all 4 algorithms:

- Fragmentation percentage
- Execution time
- Success/failure rates
- Best algorithm recommendation

### Demo Scenarios

- Fragmentation Demo
- Best vs Worst Fit
- Sequential Allocation
- Mixed Process Sizes

### Import/Export

Save and load memory states as JSON

---

## Statistics

| Metric | Description |
|--------|-------------|
| Total Memory | Configured size |
| Allocated | Used memory |
| Free | Available memory |
| Fragmentation % | External fragmentation |
| Free Blocks | Number of holes |
| Largest Free | Biggest available block |

---

## API Endpoints

```
GET  /api/memory/contiguous/state
POST /api/memory/contiguous/allocate
POST /api/memory/contiguous/deallocate
POST /api/memory/contiguous/reset
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| A | Allocate |
| R | Reset |
| C | Compact |
| H | Help |
| Escape | Close dialogs |

---

## Code Structure

### Frontend

- `pages/ContiguousAllocator.jsx` - Main component
- `pages/ContiguousAllocator.css` - Styling

### Backend

- `memory/contiguous.py` - Allocation logic
- `routes/memory_routes.py` - API endpoints

---

## Educational Use

### Exercises

1. Create fragmentation with sequential alloc/dealloc
2. Compare algorithm efficiency with same workload
3. Observe compaction eliminating fragmentation
4. Find scenarios where Worst Fit outperforms Best Fit
