# User Guide

Learn how to use the OS Simulator to understand operating system concepts.

---

## Getting Started

### Dashboard

The dashboard is your starting point, providing quick access to all modules:

- **CPU Scheduler** - Process scheduling algorithms
- **Memory Management** - Paging, segmentation, and more
- **File System** - Block allocation and file operations

---

## CPU Scheduler

### Running a Simulation

1. **Select an Algorithm** - FCFS, SJF, Priority, or Round Robin
2. **Add Processes** - Enter PID, Arrival Time, Burst Time
3. **Run Simulation** - Click "Run Simulation" or press `R`

### Using Demo Scenarios

- Click a scenario from "Demo Scenarios" panel
- Automatically loads processes and runs simulation

### Comparison Mode

1. Toggle "Comparison Mode" on
2. Add some processes
3. Click "Run Comparison"
4. View all algorithms side-by-side

---

## Memory Management

### Paging Simulator

1. **Configure Settings** - Page Size, Number of Frames, Algorithm
2. **Enter Reference String** - Space-separated page numbers
3. **Run Simulation** - Step through with controls or auto-play

### Virtual Memory

Similar to Paging but includes:

- TLB simulation
- Multiple processes
- Dirty page tracking
- Thrashing detection

### Segmentation

1. **Create a Process** - Define segments (Code, Data, Stack)
2. **Allocate Segments** - Click "Allocate" on each segment
3. **Translate Addresses** - Enter PID, Segment, Offset

### Contiguous Allocator

1. **Set Total Memory Size**
2. **Choose Algorithm** (First/Best/Worst/Next Fit)
3. **Allocate Processes**
4. **Observe Fragmentation**
5. **Click blocks to deallocate**
6. **Use Compact to defragment**

---

## File System

### Creating Files

1. Click **"+ Create"** button
2. Choose File or Directory
3. Enter name and size
4. Select parent directory
5. Click Create

### File Operations

- **Read**: Click file, then "Read" - animates block access
- **Write**: Change file size, reallocates blocks
- **Delete**: Remove file and free blocks
- **Copy/Rename**: Additional operations

### Allocation Methods

Toggle between:

- **Contiguous** - Sequential blocks
- **Linked** - Blocks point to next
- **Indexed** - Index block with pointers

### Defragmentation

1. Create and delete several files
2. Click "Defragment"
3. Watch animated consolidation

---

## Keyboard Shortcuts

| Key | Action | Available In |
|-----|--------|--------------|
| R | Run simulation | CPU Scheduler |
| C | Clear/Reset | Most modules |
| H | Toggle help | All modules |
| Space | Play/Pause | VM, Paging |
| ← → | Step navigation | VM, Paging |
| Escape | Close dialogs | All modules |

---

## Tips & Best Practices

### For Learning

1. Start with demo scenarios
2. Compare algorithms with same data
3. Read the explanations panel
4. Experiment with edge cases

### For Teaching

1. Use comparison mode for algorithm differences
2. Create custom scenarios that highlight specific concepts
3. Export and share configurations
4. Use step-by-step playback for detailed explanation

---

## Common Questions

**Q: Why is my page fault rate so high?**
A: You may have more unique pages than frames. Try increasing frames or reducing the working set.

**Q: What is Belady's anomaly?**
A: With FIFO, adding more frames can sometimes increase faults. Use the "FIFO Anomaly" preset to see this.

**Q: How do I see the difference between allocation algorithms?**
A: Use Comparison Mode in CPU Scheduler or Contiguous Allocator to see side-by-side results.
