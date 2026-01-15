# System Architecture

This document describes the overall architecture of the OS Simulator Web App.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Dashboard│ │CPU Sched│ │ Memory  │ │FileSyst │            │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │
│       └───────────┼───────────┼───────────┘                 │
│                   │    API    │                             │
└───────────────────┼───────────┼─────────────────────────────┘
                    │           │
                    ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  Schedulers  │ │    Memory    │ │  FileSystem  │         │
│  │  FCFS,SJF,   │ │ Paging,Seg,  │ │  Block ops   │         │
│  │  RR,Priority │ │ Contiguous   │ │  Allocation  │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI library |
| Vite | Build tool |
| React Router | Navigation |
| Framer Motion | Animations |
| Recharts | Data visualization |
| Axios | HTTP client |

### Backend

| Technology | Purpose |
|------------|---------|
| Python 3.8+ | Runtime |
| FastAPI | Web framework |
| Pydantic | Data validation |
| Uvicorn | ASGI server |

---

## Directory Structure

```
OS_SIMULATOR-Web_App/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API integration
│   │   └── utils/           # Helper functions
│   └── public/
├── backend/
│   ├── schedulers/          # Scheduling algorithms
│   ├── memory/              # Memory management
│   ├── filesystem/          # File system
│   ├── routes/              # API endpoints
│   ├── scenarios/           # Demo data
│   └── main.py             # Entry point
└── docs/                    # Documentation
```

---

## Data Flow

### CPU Scheduling

```
User Input → Process List → Backend Algorithm → Gantt Chart
                                     ↓
                              Metrics & Explanations
```

### Memory Management

```
Reference String → Page Replacement → Frame State
                        ↓
              Statistics & Timeline
```

### File System

```
File Operation → Block Allocation → Disk State
                      ↓
             Activity Log & Stats
```

---

## Frontend Architecture

### React Component Hierarchy

```
App
├── Dashboard (navigation hub)
├── CPUScheduler
│   ├── ProcessInput
│   ├── ProcessTimeline (Gantt)
│   ├── MetricsPanel
│   ├── ComparisonPanel
│   └── ExplanationPanel
├── MemoryManagement
│   ├── PagingSimulator
│   ├── SegmentationSimulator
│   ├── VirtualMemory
│   └── ContiguousAllocator
└── FileSystem
```

### State Management

- React hooks (useState, useEffect, useCallback)
- Local component state
- No external state library needed

---

## Backend Architecture

### API Layer

```python
FastAPI Router
    ↓
Route Handlers (routes/*.py)
    ↓
Business Logic (schedulers/, memory/, filesystem/)
    ↓
Data Models (models.py)
```

---

## Communication

### API Format

- **Protocol**: REST over HTTP
- **Format**: JSON
- **Base URL**: `http://localhost:8000/api`

### Endpoints Structure

```
/api/scheduler/*     - CPU scheduling
/api/memory/*        - Memory management
/api/filesystem/*    - File operations
```

---

## Deployment

### Development

```bash
# Backend
cd backend && python main.py

# Frontend
cd frontend && npm run dev
```

### Production

- Frontend: Static build (`npm run build`)
- Backend: Uvicorn with production settings
