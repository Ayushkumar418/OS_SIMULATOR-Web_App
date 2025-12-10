# Quick Start Guide

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- Both terminals ready

## Step 1: Start Backend Server

Open Terminal 1:

```bash
cd backend
python main.py
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

✓ Backend API: <http://localhost:8000>
✓ API Docs: <http://localhost:8000/docs>

## Step 2: Start Frontend Server

Open Terminal 2:

```bash
cd frontend
npm run dev
```

You should see:

```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

✓ Frontend App: <http://localhost:5173>

## Step 3: Test the Application

1. Open browser to <http://localhost:5173>
2. Click "CPU Scheduler" card
3. Try these quick tests:

### Quick Test 1: Manual Process Entry

- Algorithm: FCFS
- Add Process: PID=1, Arrival=0, Burst=5, Priority=0
- Add Process: PID=2, Arrival=1, Burst=3, Priority=0
- Click "Run Simulation"
- ✓ See Gantt chart
- ✓ See metrics

### Quick Test 2: Load Demo Scenario

- Select "FCFS Basic Demo" from dropdown
- Click "Run Simulation"
- ✓ See 3 processes execute
- ✓ See performance metrics

### Quick Test 3: Round Robin

- Algorithm: Round Robin
- Time Quantum: 4
- Load "Round Robin Demo"
- Click "Run Simulation"
- ✓ See processes alternate

## Troubleshooting

**Port already in use?**

```bash
# Windows - Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port in main.py
uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
```

**Frontend not connecting to backend?**

- Check vite.config.js has proxy configured
- Restart frontend dev server
- Check browser console for CORS errors

**Module not found?**

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## API Testing (without frontend)

Test backend directly:

```bash
curl -X POST http://localhost:8000/api/scheduler/run \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "fcfs",
    "processes": [
      {"pid": 1, "arrival_time": 0, "burst_time": 5, "priority": 0, "memory_required": 0}
    ],
    "time_quantum": 4
  }'
```

Or visit <http://localhost:8000/docs> for interactive API testing.

## Success Checklist

✓ Backend starts without errors
✓ Frontend starts on port 5173
✓ Dashboard loads with 3 module cards
✓ CPU Scheduler page opens
✓ Can add processes
✓ Can run simulation
✓ Gantt chart displays
✓ Metrics show correct values
✓ Explanations appear

---

**Need Help?** Check the full README.md for detailed documentation.
