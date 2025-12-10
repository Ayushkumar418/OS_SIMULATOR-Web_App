"""
Scenario management API routes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import os
from pathlib import Path

from models import Process

router = APIRouter()

# Scenarios directory path
SCENARIOS_DIR = Path(__file__).parent.parent / "scenarios"


class ScenarioData(BaseModel):
    name: str
    description: str
    algorithm: str
    time_quantum: int = 4
    processes: List[Process]
    expected_metrics: Dict[str, Any] = {}


@router.get("/list")
async def list_scenarios():
    """List available demo scenarios."""
    try:
        # Create scenarios directory if it doesn't exist
        SCENARIOS_DIR.mkdir(exist_ok=True)
        
        scenarios = []
        
        # Load all JSON files from scenarios directory
        for file_path in SCENARIOS_DIR.glob("*.json"):
            try:
                with open(file_path, 'r') as f:
                    scenario_data = json.load(f)
                    scenarios.append({
                        "id": file_path.stem,
                        "name": scenario_data.get("name", file_path.stem),
                        "description": scenario_data.get("description", ""),
                        "algorithm": scenario_data.get("algorithm", "fcfs"),
                        "process_count": len(scenario_data.get("processes", []))
                    })
            except Exception as e:
                print(f"Error loading scenario {file_path}: {e}")
                continue
        
        return {
            "success": True,
            "scenarios": scenarios
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/load/{scenario_id}")
async def load_scenario(scenario_id: str):
    """Load a specific scenario."""
    try:
        file_path = SCENARIOS_DIR / f"{scenario_id}.json"
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
        
        with open(file_path, 'r') as f:
            scenario_data = json.load(f)
        
        return {
            "success": True,
            **scenario_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_scenario(scenario: ScenarioData):
    """Save a custom scenario."""
    try:
        # Create scenarios directory if it doesn't exist
        SCENARIOS_DIR.mkdir(exist_ok=True)
        
        # Generate filename from name
        filename = scenario.name.lower().replace(" ", "_") + ".json"
        file_path = SCENARIOS_DIR / filename
        
        # Convert to dict
        scenario_dict = {
            "name": scenario.name,
            "description": scenario.description,
            "algorithm": scenario.algorithm,
            "time_quantum": scenario.time_quantum,
            "processes": [p.model_dump() for p in scenario.processes],
            "expected_metrics": scenario.expected_metrics
        }
        
        # Save to file
        with open(file_path, 'w') as f:
            json.dump(scenario_dict, f, indent=2)
        
        return {
            "success": True,
            "message": f"Scenario '{scenario.name}' saved successfully",
            "id": file_path.stem
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
