# Testing the OS Simulator Integration

## Quick Integration Test

This guide helps you verify that the backend and frontend are properly integrated and communicating.

### Step 1: Start Backend Server

```bash
cd backend
python main.py
```

**Expected Output:**

```
INFO:     Will watch for changes in these directories: ['d:\\Programming\\...\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXXX] using WatchFiles
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

✅ Backend is ready when you see "Application startup complete"

### Step 2: Test Backend API

Open another terminal and test the API directly:

```bash
curl http://localhost:8000/api/health
```

**Expected Response:**

```json
{"status":"healthy"}
```

### Step 3: Start Frontend Server

In a new terminal:

```bash
cd frontend
npm run dev
```

**Expected Output:**

```
VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

✅ Frontend is ready when you see the URL

### Step 4: Test Full Integration

1. **Open browser** to <http://localhost:5173>

2. **Dashboard should show:**
   - Title: "OS Simulator"
   - 3 cards: CPU Scheduler, Memory Management, File System
   - Features section at bottom

3. **Click "CPU Scheduler"** card

4. **You should see:**
   - Algorithm dropdown (defaultFCFS)
   - "Add Process" form
   - "Run Simulation" button (disabled initially)

5. **Add a test process:**
   - PID: 1
   - Arrival Time: 0
   - Burst Time: 5
   - Priority: 0
   - Click "+ Add Process"

6. **Verify process added:**
   - Should appear in "Current Processes (1)" section
   - Shows: P1, Arrival: 0, Burst: 5

7. **Run simulation:**
   - Click "Run Simulation" button
   - Button shows "Running..." with spinner

8. **Verify results appear:**
   - Performance Metrics cards (6 metrics)
   - Gantt Chart with blue bar for P1
   - Step-by-Step Explanation panel
   - Process Details table

9. **Test scenario loading:**
   - Select "FCFS Basic Demo" from dropdown
   - Should load 3 processes automatically
   - Click "Run Simulation"
   - Should show complete Gantt chart with 3 processes

### Step 5: Verify API Communication

**Open browser DevTools** (F12):

1. Go to Network tab
2. Click "Run Simulation"
3. Look for request to `/api/scheduler/run`
4. Should show:
   - Status: 200 OK
   - Response contains: `success: true`, `gantt_chart`, `metrics`, etc.

### Troubleshooting

**Problem:** Frontend shows "No Simulation Running" after clicking Run

- **Check:** Browser console for errors
- **Fix:** Verify backend is running on port 8000
- **Fix:** Check CORS is configured in main.py

**Problem:** "Failed to load scenarios"

- **Check:** Browser console
- **Fix:** Ensure `backend/scenarios/` directory exists
- **Fix:** Verify JSON files are valid

**Problem:** CORS errors in console

- **Check:** main.py has correct CORS origins
- **Fix:** Verify `http://localhost:5173` is in allow_origins

**Problem:** "Connection refused" to backend

- **Check:** Backend terminal for errors
- **Fix:** Ensure backend started successfully
- **Fix:** Try different port if 8000 is in use

### Success Criteria

✅ Backend starts without errors  
✅ Frontend starts and shows dashboard  
✅ Can add processes manually  
✅ Can load demo scenarios  
✅ Run Simulation makes API call  
✅ Gantt chart renders  
✅ Metrics display correct values  
✅ Explanations appear  
✅ No console errors  

### API Endpoints to Test

You can test these directly with curl or Postman:

**1. List algorithms:**

```bash
curl http://localhost:8000/api/scheduler/algorithms
```

**2. Run FCFS simulation:**

```bash
curl -X POST http://localhost:8000/api/scheduler/run \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "fcfs",
    "processes": [
      {"pid": 1, "arrival_time": 0, "burst_time": 5, "priority": 0, "memory_required": 0},
      {"pid": 2, "arrival_time": 1, "burst_time": 3, "priority": 0, "memory_required": 0}
    ],
    "time_quantum": 4
  }'
```

**3. List scenarios:**

```bash
curl http://localhost:8000/api/scenarios/list
```

**4. Memory API:**

```bash
curl -X POST http://localhost:8000/api/memory/create-page-table \
  -H "Content-Type: application/json" \
  -d '{"pid": 1, "num_pages": 8, "num_frames": 64, "page_size": 4}'
```

**5. File System API:**

```bash
curl -X POST http://localhost:8000/api/filesystem/create-file \
  -H "Content-Type: application/json" \
  -d '{"path": "/test.txt", "size": 12}'
```

---

## Integration Checklist

- [x] Backend dependencies installed
- [x] Frontend dependencies installed
- [x] Backend starts successfully
- [x] Frontend starts successfully
- [x] API health check works
- [x] Dashboard loads
- [x] CPU Scheduler page loads
- [x] Can add processes
- [x] API call succeeds
- [x] Results render correctly
- [x] Scenarios load
- [x] No console errors

**All checks passing?** 🎉 **Integration successful!**
