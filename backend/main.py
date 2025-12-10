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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
