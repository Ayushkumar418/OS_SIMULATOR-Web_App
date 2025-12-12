"""
Test script to verify Total Memory size update functionality
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/memory/contiguous"

def test_memory_size_update():
    print("=" * 60)
    print("Testing Total Memory Size Update")
    print("=" * 60)
    
    # Test 1: Reset memory
    print("\n1. Resetting memory...")
    response = requests.post(f"{BASE_URL}/reset")
    print(f"   Response: {response.json()}")
    
    # Test 2: Allocate with 3000 KB total memory
    print("\n2. Allocating process with 3000 KB total memory...")
    response = requests.post(f"{BASE_URL}/allocate", json={
        "process_id": 1,
        "size": 500,
        "algorithm": "first_fit",
        "total_memory": 3000
    })
    
    if response.status_code == 200:
        data = response.json()
        total = data['memory_state']['total_memory']
        print(f"   ✓ Success! Total Memory: {total} KB")
        print(f"   Allocated: {data['fragmentation']['total_allocated']} KB")
        print(f"   Free: {data['fragmentation']['total_free_memory']} KB")
        
        if total == 3000:
            print("\n   ✅ PASS: Total memory correctly set to 3000 KB!")
        else:
            print(f"\n   ❌ FAIL: Expected 3000 KB, got {total} KB")
    else:
        print(f"   ❌ Error: {response.status_code} - {response.text}")
    
    # Test 3: Get current state
    print("\n3. Checking current state...")
    response = requests.get(f"{BASE_URL}/state")
    state = response.json()
    print(f"   Total Memory: {state.get('total_memory', 'N/A')} KB")
    print(f"   Initialized: {state.get('initialized', False)}")
    
    # Test 4: Change to 5000 KB
    print("\n4. Resetting and changing to 5000 KB...")
    requests.post(f"{BASE_URL}/reset")
    
    response = requests.post(f"{BASE_URL}/allocate", json={
        "process_id": 2,
        "size": 100,
        "algorithm": "first_fit",
        "total_memory": 5000
    })
    
    if response.status_code == 200:
        data = response.json()
        total = data['memory_state']['total_memory']
        print(f"   ✓ Total Memory now: {total} KB")
        
        if total == 5000:
            print("\n   ✅ PASS: Total memory correctly updated to 5000 KB!")
        else:
            print(f"\n   ❌ FAIL: Expected 5000 KB, got {total} KB")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_memory_size_update()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend server.")
        print("   Make sure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")
