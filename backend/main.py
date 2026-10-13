"""
Main FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import scheduler_routes, memory_routes, filesystem_routes, scenario_routes

# Create FastAPI app
app = FastAPI(
    title="OS Simulator API",
    description="Educational Operating System Simulator - Backend API",
    version="1.0.0"
)

import os

# Configure CORS
# In production, ALLOWED_ORIGINS can be set in Render environment variables.
# By default, localhost servers and all *.vercel.app domains are supported.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

allow_all_origins = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_origin_regex=None if allow_all_origins else r"https:\/\/.*\.vercel\.app",
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scheduler_routes.router, prefix="/api/scheduler", tags=["CPU Scheduling"])
app.include_router(memory_routes.router, prefix="/api/memory", tags=["Memory Management"])
app.include_router(filesystem_routes.router, prefix="/api/filesystem", tags=["File System"])
app.include_router(scenario_routes.router, prefix="/api/scenarios", tags=["Scenarios"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OS Simulator API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    is_prod = os.environ.get("ENVIRONMENT", "development").lower() == "production"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not is_prod)
