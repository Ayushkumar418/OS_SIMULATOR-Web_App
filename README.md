# OS Simulator - Web-Based Operating System Visualizer

An interactive, educational web application that visualizes core Operating System concepts including CPU scheduling, memory management, and file system operations.

![OS Simulator](https://img.shields.io/badge/Status-Educational-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)

## 🎯 Project Overview

This OS Simulator is designed for students and educators to understand how operating systems work internally through interactive, step-by-step visualizations.

### Key Features

- **CPU Scheduling Algorithms**
  - FCFS (First Come First Serve)
  - SJF/SRTF (Shortest Job First / Shortest Remaining Time First)
  - Priority Scheduling (Preemptive & Non-Preemptive)
  - Round Robin with configurable time quantum
  
- **Memory Management**
  - Paging simulation with page tables
  - Virtual to physical address translation
  - Page fault handling
  - Page replacement algorithms (FIFO, LRU, Optimal, Clock)
  - Segmentation with protection
  - Contiguous memory allocation
  
- **File System**
  - Block-based file operations
  - Multiple allocation methods (Contiguous, Linked, Indexed)
  - Defragmentation tool
  - Access control and permissions

- **Educational Features**
  - Step-by-step explanations
  - Real-time Gantt charts
  - Performance metrics
  - Algorithm comparison mode
  - Demo scenarios

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) folder:

| Section | Description |
|---------|-------------|
| [📚 Modules](docs/modules/) | Detailed documentation for each simulator |
| [🏗️ Architecture](docs/architecture/) | System design, API reference, components |
| [📖 Guides](docs/guides/) | Installation, user guide, contributing |

### Quick Links

- [Installation Guide](docs/guides/INSTALLATION.md)
- [User Guide](docs/guides/USER_GUIDE.md)
- [API Reference](docs/architecture/API_REFERENCE.md)
- [Architecture Overview](docs/architecture/ARCHITECTURE.md)

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Ayushkumar418/OS_SIMULATOR-Web_App.git
cd OS_SIMULATOR-Web_App

# Start backend
cd backend
pip install -r requirements.txt
python main.py

# Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

## 📊 Modules

| Module | Description |
|--------|-------------|
| [CPU Scheduler](docs/modules/CPU_SCHEDULER.md) | Process scheduling algorithms visualization |
| [Paging Simulator](docs/modules/PAGING_SIMULATOR.md) | Page replacement algorithms demo |
| [Virtual Memory](docs/modules/VIRTUAL_MEMORY.md) | TLB, page replacement, thrashing |
| [Segmentation](docs/modules/SEGMENTATION.md) | Memory segmentation with protection |
| [Contiguous Allocator](docs/modules/CONTIGUOUS_ALLOCATOR.md) | First/Best/Worst/Next fit algorithms |
| [File System](docs/modules/FILE_SYSTEM.md) | Block allocation, defragmentation |

## 📚 Technical Stack

**Backend:**

- Python 3.8+
- FastAPI - Modern web framework
- Pydantic - Data validation
- Uvicorn - ASGI server

**Frontend:**

- React 18 - UI library
- Vite - Build tool
- React Router - Navigation
- Framer Motion - Animations
- Recharts - Data visualization

## 🤝 Contributing

Contributions welcome! See [Contributing Guide](docs/guides/CONTRIBUTING.md).

## 📝 License

Educational project - Free to use for learning purposes.

---

**Happy Learning! 🎓**
