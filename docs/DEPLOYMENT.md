# Deployment Guide: Frontend on Vercel & Backend on Render

This guide walks you through deploying the **OS Simulator** project:
- **Backend (FastAPI)** on **[Render](https://render.com)**
- **Frontend (React + Vite)** on **[Vercel](https://vercel.com)**

---

## 1. Deploy Backend on Render

The backend is built with **FastAPI** and **Uvicorn**, which Render natively supports.

### Option A: Using Render Blueprint (`render.yaml`) — Recommended
1. Push your latest changes to GitHub.
2. Go to the **[Render Dashboard](https://dashboard.render.com/)**.
3. Click **New +** > **Blueprint**.
4. Select your repository `Ayushkumar418/OS_SIMULATOR-Web_App`.
5. Render will detect [render.yaml](file:///d:/Programming/Google_antigravity/OS_SIMULATOR-Web_App/render.yaml) and configure the service automatically.
6. Click **Apply**.

---

### Option B: Manual Web Service Setup on Render
1. Go to the **[Render Dashboard](https://dashboard.render.com/)**.
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository: `Ayushkumar418/OS_SIMULATOR-Web_App`.
4. Configure the settings:
   - **Name**: `os-simulator-backend` (or your preferred name)
   - **Region**: Choose the region closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend` *(Important: set this to backend)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. **Environment Variables**:
   Under the *Environment Variables* section, add:
   - `PYTHON_VERSION`: `3.12.0`
   - `ENVIRONMENT`: `production`
   - `ALLOWED_ORIGINS`: `*` (or leave empty to allow all `*.vercel.app` domains automatically)
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://os-simulator-backend.onrender.com`).
   - Test it by opening `https://os-simulator-backend.onrender.com/api/health` in your browser. It should return `{"status":"healthy"}`.

> [!NOTE]
> On Render's Free tier, services spin down after 15 minutes of inactivity. When a new request arrives, it may take 30-50 seconds for the service to wake up.

---

## 2. Deploy Frontend on Vercel

The frontend is a **React SPA** built with **Vite**.

### Steps to Deploy on Vercel:
1. Go to the **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click **Add New…** > **Project**.
3. Import your GitHub repository: `Ayushkumar418/OS_SIMULATOR-Web_App`.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`** *(Critical)*
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
5. **Environment Variables**:
   Expand the *Environment Variables* section and add:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render backend URL (e.g. `https://os-simulator-backend.onrender.com` without trailing slash)
6. Click **Deploy**.
7. Vercel will build and launch your site with a URL like `https://os-simulator-web-app.vercel.app`.

---

## 3. Configuration Summary

| Setting | Backend (Render) | Frontend (Vercel) |
|---|---|---|
| **Root Directory** | `backend` | `frontend` |
| **Build Command** | `pip install -r requirements.txt` | `npm run build` |
| **Start / Output** | `uvicorn main:app --host 0.0.0.0 --port $PORT` | `dist` |
| **Environment Variable** | `ALLOWED_ORIGINS=*` *(optional)* | `VITE_API_URL=https://<your-render-app>.onrender.com` |
| **Config File** | [render.yaml](file:///d:/Programming/Google_antigravity/OS_SIMULATOR-Web_App/render.yaml) | [frontend/vercel.json](file:///d:/Programming/Google_antigravity/OS_SIMULATOR-Web_App/frontend/vercel.json) |

---

## 4. Troubleshooting & Notes

- **CORS Errors**: The backend in [backend/main.py](file:///d:/Programming/Google_antigravity/OS_SIMULATOR-Web_App/backend/main.py) automatically permits all `*.vercel.app` domains out of the box. If using a custom domain on Vercel, set `ALLOWED_ORIGINS` on Render to your custom domain or `*`.
- **404 on Refresh in Vercel**: Handled automatically via [frontend/vercel.json](file:///d:/Programming/Google_antigravity/OS_SIMULATOR-Web_App/frontend/vercel.json) which rewrites client-side routes to `/index.html`.
- **Render Cold Starts**: If the frontend shows a network timeout when loading data for the first time, allow ~45 seconds for Render's free tier instance to spin up.
