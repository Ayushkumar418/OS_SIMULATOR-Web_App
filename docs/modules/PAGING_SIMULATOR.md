# Paging Simulator Module

The Paging Simulator visualizes how operating systems use paging to manage memory, including page tables, address translation, and page replacement algorithms.

## Overview

Paging divides physical memory into fixed-size blocks called **frames** and logical memory into blocks of the same size called **pages**. This eliminates external fragmentation and simplifies memory allocation.

## Key Concepts

### Page Table

A data structure that maps virtual page numbers to physical frame numbers:

```
Virtual Address = [Page Number | Offset]
Physical Address = Page Table[Page Number] × Page Size + Offset
```

### Address Translation

1. Extract page number from virtual address
2. Look up frame number in page table
3. Combine frame number with offset

**Example** (4KB page size):

```
Virtual Address: 8192
Page Number: 8192 ÷ 4096 = 2
Offset: 8192 mod 4096 = 0
If Page 2 → Frame 5:
Physical Address: 5 × 4096 + 0 = 20480
```

---

## Page Replacement Algorithms

When a page fault occurs and no free frames exist, a page must be replaced.

### FIFO (First-In-First-Out)

- **Concept**: Replace the oldest page in memory
- **Implementation**: Queue of loaded pages
- **Pros**: Simple, low overhead
- **Cons**: Suffers from Belady's anomaly (more frames can cause more faults)

### LRU (Least Recently Used)

- **Concept**: Replace page not accessed for longest time
- **Implementation**: Track last access time per page
- **Pros**: Good approximation of optimal
- **Cons**: Expensive to implement perfectly

### Optimal (Belady's Algorithm)

- **Concept**: Replace page not used for longest time in future
- **Implementation**: Look ahead in reference string
- **Pros**: Theoretical minimum faults
- **Cons**: Requires future knowledge (not practical)

---

## Features

### Page Replacement Visualization

- Step-by-step simulation of page accesses
- Visual frame state at each step
- Fault/hit highlighting
- Victim page identification

### Statistics

- Total accesses
- Page faults and hits
- Hit ratio percentage

### Algorithm Comparison

Compare FIFO, LRU, and Optimal with the same reference string:

- Side-by-side fault counts
- Best algorithm recommendation

### Demo Scenarios

Pre-built examples demonstrating:

- Basic paging behavior
- Belady's anomaly (FIFO)
- Locality of reference
- Working set patterns

### Address Translation

Interactive tool to convert:

- Decimal addresses
- Hexadecimal addresses
- Binary addresses

---

## Configuration Options

| Option | Range | Description |
|--------|-------|-------------|
| Page Size | 4-16 KB | Size of each page/frame |
| Physical Frames | 4-16 | Number of frames in physical memory |
| Algorithm | FIFO/LRU/Optimal | Page replacement strategy |

---

## API Endpoints

### Create Page Table

```
POST /api/memory/create-page-table
```

```json
{
  "pid": 1,
  "num_pages": 16,
  "num_frames": 8,
  "page_size": 4096
}
```

### Access Page

```
POST /api/memory/access-page
```

### Page Replacement

```
POST /api/memory/page-replacement
```

---

## Code Structure

### Frontend

- `pages/PagingSimulator.jsx` - Main component (1200+ lines)
- `pages/PagingSimulator.css` - Matrix-themed styles

### Backend

- `memory/paging.py` - Paging logic
- `memory/page_replacement.py` - Replacement algorithms

---

## Educational Use

### Learning Objectives

1. Understand page-to-frame mapping
2. Calculate physical addresses from virtual addresses
3. Compare replacement algorithm performance
4. Identify Belady's anomaly cases

### Exercises

1. Run the same reference string with different algorithms
2. Observe how frame count affects fault rate
3. Create scenarios that favor LRU over FIFO
4. Find reference strings that trigger Belady's anomaly
