# File System Module

The File System module provides comprehensive visualization of file system operations, block allocation methods, and disk management features.

## Overview

This module simulates a block-based file system with support for multiple allocation methods, directory tree management, and advanced features like defragmentation and journaling.

## Key Concepts

### Block Allocation Methods

#### Contiguous Allocation

- Files occupy consecutive blocks
- **Pros**: Fast sequential access, simple
- **Cons**: External fragmentation, file growth issues

#### Linked Allocation

- Each block points to the next block
- **Pros**: No external fragmentation, easy growth
- **Cons**: Slow random access, pointer overhead

#### Indexed Allocation

- Index block contains pointers to data blocks
- **Pros**: Direct access, no fragmentation
- **Cons**: Index block overhead, size limits

---

## Features

### Directory Management

- Hierarchical directory tree
- Create files and directories
- Navigate and select items
- Search functionality

### File Operations

- **Create**: Allocate blocks for new files
- **Read**: Highlight and simulate block access
- **Write**: Resize and reallocate blocks
- **Delete**: Free allocated blocks
- **Copy/Move/Rename**: File manipulation

### Block Visualization

- 100-block disk grid display
- Color-coded file blocks
- Free space visualization
- Animation for operations
- Allocation type indicators

### Content Editor

- Edit actual file content
- Content-based size calculation
- Save with automatic resizing

### Defragmentation

- Animated consolidation process
- Progress indicator
- Converts to contiguous allocation

### Access Control

- Read/Write/Execute permissions (rwx)
- Per-file owner tracking
- Permission violation detection

### Journaling (Demo)

- Operation logging
- Recovery simulation
- Transaction visualization

### Multi-User Support

- User accounts with quotas
- Usage tracking per user
- Quota enforcement

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| Total Blocks | 100 | Disk size in blocks |
| Block Size | 4 KB | Size per block |
| Allocation | Linked | Allocation method |
| Journaling | Off | Enable journaling |

---

## Demo Scenarios

Pre-built scenarios demonstrating:

- Basic operations
- Fragmentation effects
- Allocation method comparisons
- Permission scenarios

---

## API Endpoints

### File Operations

```
POST /api/filesystem/create-file
POST /api/filesystem/read-file
POST /api/filesystem/write-file
DELETE /api/filesystem/delete
```

### Block Management

```
GET /api/filesystem/blocks
POST /api/filesystem/allocate
```

---

## Code Structure

### Frontend

- `pages/FileSystem.jsx` - Main component (2000+ lines)
- `pages/FileSystem.css` - Comprehensive styling

### Backend

- `filesystem/filesystem.py` - Core file system logic
- `routes/filesystem_routes.py` - API endpoints

---

## Statistics Tracked

- Total/used/free blocks
- Fragmentation percentage
- Files and directories count
- Operation history (activity log)

---

## Educational Use

### Learning Objectives

1. Compare allocation method trade-offs
2. Understand disk fragmentation
3. Visualize file block layout
4. Learn permission systems

### Exercises

1. Create files with different allocation methods
2. Delete files and observe fragmentation
3. Run defragmentation and compare before/after
4. Test permission violations
