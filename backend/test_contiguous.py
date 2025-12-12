"""
Test script for contiguous memory allocation API
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/memory"

def test_contiguous_allocation():
    print("=" * 60)
    print("TESTING CONTIGUOUS MEMORY ALLOCATION API")
    print("=" * 60)
    
    # Test 1: First Fit
    print("\n1. Testing First Fit Algorithm...")
    response = requests.post(f"{BASE_URL}/contiguous/allocate", json={
        "process_id": 1,
        "size": 100,
        "algorithm": "first_fit",
        "total_memory": 1000
    })
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result['success']}")
    print(f"Allocated Block: {result['allocated_block']}")
    print(f"Explanations: {result['explanations']}")
    
    # Test 2: Best Fit
    print("\n2. Testing Best Fit Algorithm...")
    response = requests.post(f"{BASE_URL}/contiguous/allocate", json={
        "process_id": 2,
        "size": 50,
        "algorithm": "best_fit"
    })
    result = response.json()
    print(f"Success: {result['success']}")
    print(f"Allocated Block: {result['allocated_block']}")
    
    # Test 3: Worst Fit
    print("\n3. Testing Worst Fit Algorithm...")
    response = requests.post(f"{BASE_URL}/contiguous/allocate", json={
        "process_id": 3,
        "size": 200,
        "algorithm": "worst_fit"
    })
    result = response.json()
    print(f"Success: {result['success']}")
    print(f"Allocated Block: {result['allocated_block']}")
    
    # Test 4: Get Memory State
    print("\n4. Getting current memory state...")
    response = requests.get(f"{BASE_URL}/contiguous/state")
    state = response.json()
    print(f"Initialized: {state['initialized']}")
    print(f"Total Memory: {state['total_memory']} KB")
    print(f"Allocated Blocks: {state['allocated_blocks']}")
    print(f"Free Blocks: {state['free_blocks']}")
    print(f"Fragmentation: {state['fragmentation']}")
    
    # Test 5: Deallocate
    print("\n5. Deallocating Process 2...")
    response = requests.post(f"{BASE_URL}/contiguous/deallocate", json={
        "process_id": 2
    })
    result = response.json()
    print(f"Success: {result['success']}")
    print(f"Explanations: {result['explanations']}")
    
    # Test 6: Final State
    print("\n6. Final memory state...")
    response = requests.get(f"{BASE_URL}/contiguous/state")
    state = response.json()
    print("\nMemory Blocks:")
    for i, block in enumerate(state['blocks']):
        status = f"Process {block['process_id']}" if block['allocated'] else "FREE"
        print(f"  Block {i}: [{block['start']:4d}-{block['end']:4d}] Size: {block['size']:3d} KB - {status}")
    
    print(f"\nFragmentation Stats:")
    print(f"  External Fragments: {state['fragmentation']['external_fragments']}")
    print(f"  Fragmentation %: {state['fragmentation']['fragmentation_percentage']}%")
    
    # Test 7: Reset
    print("\n7. Testing Reset...")
    response = requests.post(f"{BASE_URL}/contiguous/reset")
    print(f"Reset: {response.json()['success']}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_contiguous_allocation()
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to API. Is the backend server running?")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
