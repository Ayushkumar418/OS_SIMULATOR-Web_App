# Installation Guide

Complete setup instructions for the OS Simulator Web App.

## Prerequisites

- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **npm** or **yarn**

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Ayushkumar418/OS_SIMULATOR-Web_App.git
cd OS_SIMULATOR-Web_App
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Open new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## Verification

1. Open `http://localhost:5173` in your browser
2. You should see the OS Simulator Dashboard
3. Navigate to CPU Scheduler and run a demo scenario
4. Check `http://localhost:8000/docs` for API documentation

---

## Configuration

### Backend Port

Edit `backend/main.py`:

```python
uvicorn.run("main:app", host="0.0.0.0", port=8000)
```

### Frontend API Base

Edit `frontend/src/services/api.js` if backend is on different port.

---

## Troubleshooting

### Backend won't start

- Ensure Python 3.8+ is installed: `python --version`
- Check if port 8000 is in use
- Verify all dependencies installed: `pip install -r requirements.txt`

### Frontend won't start

- Ensure Node.js 16+ is installed: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if port 5173 is in use

### CORS errors

- Ensure backend is running on port 8000
- Check that CORS is enabled in `backend/main.py`

### API connection failed

- Verify backend is running
- Check browser console for errors
- Ensure frontend proxy is configured correctly

---

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

The build files will be in `frontend/dist/`

### Backend

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | Dual-core | Quad-core |
| Disk | 500 MB | 1 GB |
| Browser | Chrome 80+ | Latest Chrome/Firefox |
