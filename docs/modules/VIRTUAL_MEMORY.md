# Virtual Memory Module

The Virtual Memory module provides comprehensive simulation of virtual memory systems, including TLB (Translation Lookaside Buffer), multiple page replacement algorithms, and thrashing detection.

## Overview

Virtual memory creates an illusion of large contiguous memory for each process by using disk as secondary storage. This module demonstrates the complete virtual memory workflow from address translation to page replacement.

## Key Concepts

### Virtual Address Translation

```
Virtual Address → TLB Check → Page Table → Physical Memory
                     ↓ (miss)
               Page Table Lookup
                     ↓
               Frame or Page Fault
```

### Translation Lookaside Buffer (TLB)

A fast hardware cache that stores recent page-to-frame translations:

- **TLB Hit**: Fast translation (1 cycle)
- **TLB Miss**: Page table lookup required (100+ cycles)

### Page Fault Handling

When accessing a page not in memory:

1. Trap to OS
2. Find free frame or select victim
3. If victim dirty, write to disk
4. Load requested page from disk
5. Update page table and TLB
6. Restart instruction

---

## Supported Algorithms

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| **FIFO** | Replace oldest page | Simple systems |
| **LRU** | Replace least recently used | General workloads |
| **Optimal** | Replace page used furthest in future | Benchmark only |
| **Clock** | Second-chance with reference bit | Practical LRU approximation |
| **LFU** | Replace least frequently used | Stable access patterns |
| **MFU** | Replace most frequently used | Pages quickly obsolete |

---

## Features

### TLB Simulation

- Configurable TLB size
- TLB hit/miss tracking
- Visual TLB state display
- TLB hit animations

### Multi-Process Support

- Add/remove processes
- Per-process page tables
- Context switch simulation
- Process color customization

### Dirty Page Tracking

- Automatic dirty bit management
- Write-back tracking
- Disk write statistics

### Thrashing Detection

- CPU utilization graph
- Working set size tracking
- Thrashing warning indicator
- Real-time fault rate monitoring

### Algorithm Comparison

Compare all 6 algorithms simultaneously:

- Page fault comparison
- Hit ratio analysis
- Best algorithm recommendation
- Detailed analysis text

### Working Set Visualization

- Configurable window size
- Real-time working set display
- Locality pattern identification

---

## Statistics Tracked

| Metric | Description |
|--------|-------------|
| Page Faults | Pages loaded from disk |
| Page Hits | Pages found in memory |
| TLB Hits | Fast translations |
| TLB Misses | Page table lookups required |
| Disk Reads | Pages loaded from disk |
| Disk Writes | Dirty pages written to disk |

---

## Demo Scenarios

| Scenario | Purpose |
|----------|---------|
| Locality Demo | Shows temporal locality benefits |
| Thrashing Demo | High fault rate with poor locality |
| Working Set | Working set behavior visualization |
| FIFO Anomaly | Belady's anomaly demonstration |
| LRU Optimal | Cases where LRU excels |
| Random Access | Poor locality impact |

---

## Configuration

| Option | Range | Description |
|--------|-------|-------------|
| Physical Frames | 2-16 | Number of memory frames |
| Page Size | 4-16 KB | Size of each page |
| TLB Size | 2-8 | TLB entry count |
| Algorithm | 6 options | Replacement strategy |
| Working Set Window | 2-10 | Locality window size |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause simulation |
| ← | Previous step |
| → | Next step |
| R | Reset simulation |
| H | Toggle help |
| Escape | Close dialogs |

---

## Code Structure

### Frontend

- `pages/VirtualMemory.jsx` - Main component (1800+ lines)
- `pages/VirtualMemory.css` - Comprehensive styling

### Backend

- `memory/paging.py` - Core paging logic
- `memory/page_replacement.py` - All replacement algorithms

---

## Educational Use

### Learning Objectives

1. Understand TLB's role in performance
2. Compare page replacement algorithms
3. Identify thrashing conditions
4. Analyze working set behavior

### Exercises

1. Compare hit ratios with different TLB sizes
2. Create workloads that cause thrashing
3. Find scenarios where Clock matches LRU
4. Observe dirty page write-back patterns
