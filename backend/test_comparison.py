"""
Test script to verify Algorithm Comparison functionality
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/memory/contiguous"

def test_comparison():
    print("=" * 60)
    print("Testing Algorithm Comparison Feature")
    print("=" * 60)
    
    # Reset memory
    print("\n1. Resetting memory...")
    requests.post(f"{BASE_URL}/reset")
    
    # Allocate some processes for comparison
    processes = [
        {"id": 1, "size": 200},
        {"id": 2, "size": 100},
        {"id": 3, "size": 150}
    ]
    
    print("\n2. Allocating test processes...")
    for proc in processes:
        response = requests.post(f"{BASE_URL}/allocate", json={
            "process_id": proc["id"],
            "size": proc["size"],
            "algorithm": "first_fit",
            "total_memory": 1000
        })
        if response.status_code == 200:
            print(f"   ✓ Allocated P{proc['id']}: {proc['size']} KB")
    
    # Test each algorithm
    print("\n3. Testing all algorithms with same processes...")
    algorithms = ['first_fit', 'best_fit', 'worst_fit', 'next_fit']
    results = []
    
    for algo in algorithms:
        print(f"\n   Testing {algo.upper()}...")
        
        # Reset
        requests.post(f"{BASE_URL}/reset")
        
        # Allocate with this algorithm
        fragmentation = None
        for proc in processes:
            response = requests.post(f"{BASE_URL}/allocate", json={
                "process_id": proc["id"],
                "size": proc["size"],
                "algorithm": algo,
                "total_memory": 1000
            })
            if response.status_code == 200:
                fragmentation = response.json()['fragmentation']
        
        if fragmentation:
            results.append({
                'algorithm': algo,
                'fragmentation': fragmentation['fragmentation_percentage'],
                'free_blocks': fragmentation['external_fragments'],
                'largest_free': fragmentation['largest_free_block']
            })
            print(f"      Fragmentation: {fragmentation['fragmentation_percentage']}%")
            print(f"      Free Blocks: {fragmentation['external_fragments']}")
            print(f"      Largest Free: {fragmentation['largest_free_block']} KB")
    
    # Show comparison
    print("\n4. COMPARISON RESULTS:")
    print("   " + "-" * 56)
    print(f"   {'Algorithm':<15} {'Frag%':<10} {'Free Blocks':<15} {'Largest Free'}")
    print("   " + "-" * 56)
    
    best = min(results, key=lambda x: x['fragmentation'])
    
    for r in results:
        marker = "🏆" if r['algorithm'] == best['algorithm'] else "  "
        print(f"   {marker} {r['algorithm'].upper():<15} {r['fragmentation']:<10} "
              f"{r['free_blocks']:<15} {r['largest_free']} KB")
    
    print("   " + "-" * 56)
    print(f"\n   ✓ Best Algorithm: {best['algorithm'].upper()} (Lowest fragmentation)")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_comparison()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
