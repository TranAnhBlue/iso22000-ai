import json
import urllib.request
import urllib.parse

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_api():
    print("=== 1. TEST SEED BUILDERS ===")
    req = urllib.request.Request(f"{BASE_URL}/builders/seed-defaults", data=b"", method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] Seed builders: {data}")
    except Exception as e:
        print(f"[FAILED] Seed builders: {e}")

    print("\n=== 2. TEST GET FORM TEMPLATES ===")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/builders/forms") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] Forms count: {len(data)}")
            for f in data:
                print(f"  - [{f['module']}] {f['code']}: {f['title']} ({len(f['fields'])} fields)")
    except Exception as e:
        print(f"[FAILED] Get forms: {e}")

    print("\n=== 3. TEST GET WORKFLOW TEMPLATES ===")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/builders/workflows") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] Workflows count: {len(data)}")
            for w in data:
                print(f"  - [{w['module']}] {w['code']}: {w['title']} ({len(w['nodes'])} nodes, {len(w['edges'])} edges)")
    except Exception as e:
        print(f"[FAILED] Get workflows: {e}")

    print("\n=== 4. TEST GET HACCP PLANS ===")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/haccp/plans") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] HACCP Plans count: {len(data)}")
            for p in data:
                print(f"  - {p['plan_code']}: {p['plan_name']} (Ver {p['version']}, Steps: {p['step_count']}, CCPs: {p['ccp_count']})")
    except Exception as e:
        print(f"[FAILED] Get HACCP plans: {e}")

    print("\n=== 5. TEST GET PROCESS STEPS ===")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/haccp/process-steps") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] Process steps count: {len(data)}")
            for s in data:
                ccp_tag = "[CCP/oPRP]" if s['is_ccp_or_oprp'] else ""
                print(f"  - Step {s['step_number']}: {s['step_name']} {ccp_tag} (Plan: {s.get('plan_name')})")
    except Exception as e:
        print(f"[FAILED] Get steps: {e}")

if __name__ == "__main__":
    test_api()
