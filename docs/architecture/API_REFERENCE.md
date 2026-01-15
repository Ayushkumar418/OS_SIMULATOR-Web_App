# API Reference

Complete REST API documentation for the OS Simulator backend.

**Base URL**: `http://localhost:8000`

**API Documentation**: `http://localhost:8000/docs` (Swagger UI)

---

## Scheduler Endpoints

### Run Simulation

```http
POST /api/scheduler/run
```

**Request Body:**

```json
{
  "algorithm": "fcfs",
  "processes": [
    {"pid": 1, "arrival_time": 0, "burst_time": 5, "priority": 1}
  ],
  "time_quantum": 4,
  "preemptive": false
}
```

**Response:**

```json
{
  "gantt_chart": [{"pid": 1, "start": 0, "end": 5, "duration": 5}],
  "completed_processes": [...],
  "metrics": {
    "average_waiting_time": 2.5,
    "average_turnaround_time": 7.5,
    "average_response_time": 2.5,
    "cpu_utilization": 100.0,
    "throughput": 0.4,
    "total_context_switches": 3
  },
  "explanations": [...]
}
```

### Compare Algorithms

```http
POST /api/scheduler/compare
```

### List Algorithms

```http
GET /api/scheduler/algorithms
```

---

## Memory Endpoints

### Contiguous Allocation

#### Get State

```http
GET /api/memory/contiguous/state
```

#### Allocate

```http
POST /api/memory/contiguous/allocate
```

```json
{
  "process_id": 1,
  "size": 100,
  "algorithm": "first_fit",
  "total_memory": 1000
}
```

#### Deallocate

```http
POST /api/memory/contiguous/deallocate
```

#### Reset

```http
POST /api/memory/contiguous/reset
```

### Paging

#### Create Page Table

```http
POST /api/memory/create-page-table
```

#### Access Page

```http
POST /api/memory/access-page
```

#### Page Replacement

```http
POST /api/memory/page-replacement
```

### Segmentation

#### Create Segment Table

```http
POST /api/memory/segmentation/create
```

#### Allocate Segment

```http
POST /api/memory/segmentation/allocate
```

#### Translate Address

```http
POST /api/memory/segmentation/translate
```

---

## File System Endpoints

### Create File

```http
POST /api/filesystem/create-file
```

### Read File

```http
POST /api/filesystem/read-file
```

### Write File

```http
POST /api/filesystem/write-file
```

### Delete File

```http
DELETE /api/filesystem/delete
```

---

## Scenario Endpoints

### List Scenarios

```http
GET /api/scenarios/list
```

### Load Scenario

```http
GET /api/scenarios/load/{scenario_id}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Error message description"
}
```

**Common Status Codes:**

- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error
