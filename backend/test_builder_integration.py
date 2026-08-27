import urllib.request
import json

def test_api():
    base_url = "http://127.0.0.1:8000/api/v1/builders"
    
    print("1. Testing GET /api/v1/builders/forms...")
    try:
        req = urllib.request.Request(f"{base_url}/forms")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"   => Found {len(data)} form templates:")
            for f in data:
                print(f"      - [{f.get('code')}] {f.get('title')} ({len(f.get('fields', []))} fields)")
    except Exception as e:
        print(f"   => Error: {e}")

    print("\n2. Testing GET /api/v1/builders/workflows...")
    try:
        req = urllib.request.Request(f"{base_url}/workflows")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"   => Found {len(data)} workflow templates:")
            for w in data:
                print(f"      - [{w.get('code')}] {w.get('title')} ({len(w.get('nodes', []))} nodes, {len(w.get('edges', []))} edges)")
    except Exception as e:
        print(f"   => Error: {e}")

    print("\n3. Testing POST submission for FORM-VENDOR-01...")
    try:
        payload = {
            "template_id": "FORM-VENDOR-01",
            "reference_id": "SUP-TEST-01",
            "reference_type": "SUPPLIER",
            "submitted_by_name": "Test Runner",
            "form_data": {
                "supplier_name": "Công ty TNHH Thủy Sản Biển Đông",
                "has_iso_cert": True,
                "quality_score": 96,
                "ontime_delivery_rate": 99,
                "supplier_ranking": "Hạng A (Ưu tiên)"
            },
            "status": "COMPLETED"
        }
        req = urllib.request.Request(
            f"{base_url}/submissions",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"   => Submission successful! ID: {data.get('submission_id')}")
    except Exception as e:
        print(f"   => Error: {e}")

if __name__ == "__main__":
    test_api()
