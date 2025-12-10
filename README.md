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
  - Page replacement algorithms (FIFO, LRU, Optimal)
  
- **File System**
  - Block-based file operations
  - Create, read, write, delete operations
  - Block allocation visualization
  - Directory and file management

- **Educational Features**
  - Step-by-step explanations
  - Real-time Gantt charts
  - Performance metrics
  - Process state transitions
  - Demo scenarios for teaching

## 🏗️ Architecture

```
OS_SIMULATOR(Web_App)/
├── backend/          # Python FastAPI backend
│   ├── schedulers/   # CPU scheduling algorithms
│   ├── memory/       # Memory management & paging
│   ├── filesystem/   # File system simulation
│   ├── routes/       # REST API endpoints
│   └── scenarios/    # Demo scenarios
└── frontend/         # React.js frontend
    ├── src/
    │   ├── pages/       # Main application pages
    │   ├── components/  # Reusable UI components
    │   └── services/    # API integration
    └── public/
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Start the FastAPI server:

```bash
python main.py
```

The backend API will be available at `http://localhost:8000`

- API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📖 Usage

### Running CPU Scheduler Simulation

1. Navigate to the CPU Scheduler page
2. Select a scheduling algorithm (FCFS, SJF, Priority, or Round Robin)
3. Add processes with arrival time, burst time, and priority
4. Or load a pre-built demo scenario
5. Click "Run Simulation" to see:
   - Gantt chart visualization
   - Performance metrics
   - Step-by-step explanations
   - Process details table

### Testing Memory Management

API endpoints available at `/api/memory/*`:

- Create page tables
- Allocate pages
- Simulate page faults
- Test page replacement algorithms

### Testing File System

API endpoints available at `/api/filesystem/*`:

- Create files and directories
- Read/write operations
- Block visualization
- File deletion

## 🎓 Educational Use Cases

- **Operating Systems Courses**: Demonstrate scheduling algorithms and their trade-offs
- **Lab Sessions**: Interactive exercises with custom scenarios
- **Self-Study**: Learn OS concepts through visualization
- **Exam Preparation**: Compare algorithm performance metrics

## 📊 Demo Scenarios

Pre-built scenarios available in `backend/scenarios/`:

- `fcfs_basic.json` - Simple FCFS demonstration
- `round_robin_demo.json` - Round Robin with time quantum effects

## 🔧 API Documentation

### Scheduler Endpoints

- `POST /api/scheduler/run` - Run simulation
- `POST /api/scheduler/compare` - Compare algorithms
- `GET /api/scheduler/algorithms` - List available algorithms

### Memory Endpoints

- `POST /api/memory/create-page-table` - Create page table
- `POST /api/memory/access-page` - Access page (may cause fault)
- `POST /api/memory/page-replacement` - Simulate replacement

### File System Endpoints

- `POST /api/filesystem/create-file` - Create file
- `POST /api/filesystem/read-file` - Read file
- `POST /api/filesystem/write-file` - Write to file
- `DELETE /api/filesystem/delete` - Delete file/directory

Full API documentation available at `http://localhost:8000/docs` when running the backend.

## 🎨 Design

The application features:

- Modern dark theme with vibrant accents
- Smooth animations using Framer Motion
- Responsive design for various screen sizes
- Glassmorphism effects
- Interactive visualizations

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Manual Testing

1. Start both backend and frontend servers
2. Navigate through the application
3. Test each scheduling algorithm
4. Verify metrics calculations
5. Check explanations for accuracy

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
- Axios - HTTP client

## 🤝 Contributing

This is an educational project. Contributions welcome for:

- Additional scheduling algorithms
- More memory management features
- Enhanced visualizations
- Additional demo scenarios
- Documentation improvements

## 📝 License

Educational project - Free to use for learning purposes.

## 👥 Authors

Developed as a comprehensive Operating Systems educational simulator.

## 🙏 Acknowledgments

- Inspired by classic OS textbooks and concepts
- Built for students and educators
- Designed with modern web technologies

## 📞 Support

For questions or issues:

- Check the API documentation at `/docs`
- Review demo scenarios for examples
- Examine the code comments for implementation details

---

**Happy Learning! 🎓**
