# Memory Management Overview

Memory Management is a critical operating system function that controls and coordinates computer memory. This module provides visualization tools for understanding various memory management concepts.

## Overview

The OS Simulator includes several memory management modules that demonstrate different aspects of how operating systems manage memory allocation and virtual addressing.

## Sub-Modules

### 1. [Paging Simulator](PAGING_SIMULATOR.md)

Demonstrates the paging memory management scheme where physical memory is divided into fixed-size blocks called frames, and logical memory into pages.

**Key Concepts:**

- Page tables
- Page-to-frame mapping
- Page fault handling
- Page replacement algorithms (FIFO, LRU, Optimal, Clock)
- Address translation

### 2. [Segmentation Simulator](SEGMENTATION.md)

Visualizes segmentation, which divides memory into variable-sized segments based on the logical divisions of a program.

**Key Concepts:**

- Segment tables
- Memory allocation strategies (First Fit, Best Fit, Worst Fit)
- External fragmentation
- Segment protection

### 3. [Virtual Memory](VIRTUAL_MEMORY.md)

Comprehensive virtual memory simulation combining paging with TLB (Translation Lookaside Buffer).

**Key Concepts:**

- Virtual-to-physical address translation
- TLB caching and management
- Page replacement in VM context
- Dirty page tracking
- Multi-level page tables

### 4. [Contiguous Allocator](CONTIGUOUS_ALLOCATOR.md)

Demonstrates contiguous memory allocation where each process occupies a single continuous block of memory.

**Key Concepts:**

- Memory allocation algorithms
- Memory compaction
- Internal vs. external fragmentation
- Hole management

---

## Memory Management Concepts

### Address Translation

The process of converting logical (virtual) addresses to physical addresses:

```
Logical Address → MMU → Physical Address
```

**In Paging:**

```
Logical Address = [Page Number | Page Offset]
Physical Address = Frame Number × Page Size + Offset
```

**In Segmentation:**

```
Logical Address = [Segment Number | Offset]
Physical Address = Segment Base + Offset
```

### Memory Allocation Strategies

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| First Fit | First hole that fits | Fast allocation | Fragmentation at front |
| Best Fit | Smallest hole that fits | Minimizes waste | Slower, tiny fragments |
| Worst Fit | Largest hole | Leaves usable holes | Fast fragmentation |
| Next Fit | First fit from last allocation | Distributes allocation | Similar to First Fit |

### Page Replacement Algorithms

Used when a page fault occurs and memory is full:

| Algorithm | Description | Pros | Cons |
|-----------|-------------|------|------|
| FIFO | Replace oldest page | Simple | Belady's anomaly |
| LRU | Replace least recently used | Good performance | Expensive to implement |
| Optimal | Replace page not used longest | Best possible | Requires future knowledge |
| Clock | Circular FIFO with use bit | Good balance | Approximation |

---

## Navigation

From the Memory Management page, you can access:

- Paging Simulator
- Segmentation Simulator
- Virtual Memory Simulator
- Contiguous Allocator

Each module provides interactive visualization with educational explanations.

---

## API Endpoints

### Memory Routes

- `POST /api/memory/allocate` - Allocate memory block
- `POST /api/memory/deallocate` - Free memory block
- `GET /api/memory/state` - Get current memory state
- `POST /api/memory/page-table/create` - Create page table
- `POST /api/memory/access` - Access memory address
- `POST /api/memory/page-replacement` - Simulate page replacement

See individual module documentation for specific endpoints.

---

## Code Structure

### Frontend

- `pages/MemoryManagement.jsx` - Overview and navigation
- `pages/PagingSimulator.jsx` - Paging visualization
- `pages/SegmentationSimulator.jsx` - Segmentation visualization
- `pages/VirtualMemory.jsx` - Virtual memory simulation
- `pages/ContiguousAllocator.jsx` - Contiguous allocation

### Backend

- `memory/paging.py` - Paging logic
- `memory/segmentation.py` - Segmentation logic
- `memory/contiguous.py` - Contiguous allocation
- `memory/page_replacement.py` - Page replacement algorithms
- `routes/memory_routes.py` - API endpoints

---

## Learning Path

**Recommended order for learning:**

1. **Contiguous Allocation** - Understand basic memory allocation
2. **Segmentation** - Learn variable-size allocation
3. **Paging** - Understand fixed-size allocation and page tables
4. **Virtual Memory** - Combine concepts with TLB and demand paging
