# Segmentation Simulator Module

The Segmentation Simulator demonstrates memory segmentation, where logical memory is divided into variable-sized segments based on the logical divisions of a program.

## Overview

Segmentation divides memory into logical units (code, data, stack, heap) rather than fixed-size pages. Each segment has a base address, limit, and protection bits.

## Key Concepts

### Segment Table

Maps segment numbers to physical memory locations:

```
Segment Table Entry:
┌─────────┬──────┬───────┬────────────┐
│ Segment │ Base │ Limit │ Protection │
├─────────┼──────┼───────┼────────────┤
│ Code    │ 1000 │  150  │    R-X     │
│ Data    │ 1200 │  100  │    RW-     │
│ Stack   │ 1400 │   80  │    RW-     │
└─────────┴──────┴───────┴────────────┘
```

### Address Translation

```
Logical Address = [Segment Number : Offset]
Physical Address = Base[Segment] + Offset

Protection Check: Offset < Limit
```

### Protection Bits

- **R (Read)**: Data can be read
- **W (Write)**: Data can be modified
- **X (Execute)**: Code can be executed

---

## Allocation Algorithms

| Algorithm | Description | Behavior |
|-----------|-------------|----------|
| **First Fit** | Use first hole that fits | Fast, may cause fragmentation at front |
| **Best Fit** | Use smallest adequate hole | Minimizes wasted space, slow |
| **Worst Fit** | Use largest hole | Leaves usable holes |
| **Next Fit** | First fit from last allocation | Distributes allocations evenly |

---

## Features

### Segment Management

- Create processes with multiple segments
- Allocate/deallocate individual segments
- Segment resizing (grow/shrink)
- Segment sharing between processes

### Memory Visualization

- Real-time memory map with segments and holes
- Color-coded segments per process
- Fragmentation percentage display
- Hover details for each block

### Address Translation

- Interactive translator with validation
- Protection violation detection
- Step-by-step translation display

### Protection Testing

- Test read/write/execute access
- Permission violation alerts

### Algorithm Comparison

Compare First Fit, Best Fit, and Worst Fit:

- Success/failure rates
- Fragmentation levels
- Memory utilization

### Memory Compaction

- Consolidate all segments to eliminate holes
- Animated compaction visualization
- Automatic segment table updates

---

## Configuration

| Option | Range | Description |
|--------|-------|-------------|
| Total Memory | 256-4096 | Memory in bytes |
| Algorithm | 4 options | Allocation strategy |

---

## API Endpoints

### Create Segment Table

```
POST /api/memory/segmentation/create
```

### Allocate Segment

```
POST /api/memory/segmentation/allocate
```

### Translate Address

```
POST /api/memory/segmentation/translate
```

---

## Code Structure

### Frontend

- `pages/SegmentationSimulator.jsx` - Main component (1700+ lines)
- `pages/SegmentationSimulator.css` - Styling

### Backend

- `memory/segmentation.py` - Segmentation logic (25KB)

---

## Educational Use

### Learning Objectives

1. Understand segment-based memory organization
2. Compare allocation algorithms
3. Identify external fragmentation
4. Analyze protection mechanisms

### Exercises

1. Create processes and observe memory layout
2. Compare allocation algorithms with same workload
3. Cause protection violations intentionally
4. Observe compaction eliminating fragmentation
