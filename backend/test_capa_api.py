import urllib.request
import json
import sys

def test_capa():
    base_url = "http://127.0.0.1:8000/api/v1/capa"

    print("1. Testing GET /api/v1/capa/stats...")
    try:
        req = urllib.request.Request(f"{base_url}/stats")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"   => Stats: Total NCs={data.get('total_ncs')}, Critical={data.get('critical_ncs')}, Total CAPAs={data.get('total_capas')}, Effectiveness={data.get('effectiveness_rate')}%")
    except Exception as e:
        print("   => Stats Error:", e)

    print("\n2. Testing GET /api/v1/capa/ncs...")
    try:
        req = urllib.request.Request(f"{base_url}/ncs")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"   => Found {len(data)} NCs:")
            for nc in data[:3]:
                print(f"      - [{nc.get('nc_number')}] {nc.get('severity')} - {nc.get('status')}")
    except Exception as e:
        print("   => NCs Error:", e)

    print("\n3. Testing GET /api/v1/capa/records...")
    try:
        req = urllib.request.Request(f"{base_url}/records")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"   => Found {len(data)} CAPA records:")
            for c in data[:3]:
                print(f"      - [{c.get('capa_number')}] {c.get('status')} - Verif: {c.get('verification_status')}")
    except Exception as e:
        print("   => Records Error:", e)

    print("\n4. Testing POST /api/v1/capa/ai/analyze-5why...")
    try:
        payload = {
            "nc_title": "Nhiet do noi thanh trung Retort bi tut xuong 81C",
            "description": "Nhiet do ke SCADA ghi nhan nhiet do tut duoi CL 85C trong 8 phut",
            "source": "HACCP_CCP"
        }
        req = urllib.request.Request(
            f"{base_url}/ai/analyze-5why",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("   => AI 5-Why Result successfully returned!")
            print(f"      Problem: {data.get('problem_statement')}")
            print(f"      Why count: {len(data.get('whys', []))}")
    except Exception as e:
        print("   => AI Error:", e)

    print("\n5. Testing POST /api/v1/capa/ai/analyze-fishbone...")
    try:
        payload = {
            "nc_title": "Phat hien mat kim loai trong me cha ca",
            "description": "May do kim loai phat hien mat Fe 2.0mm"
        }
        req = urllib.request.Request(
            f"{base_url}/ai/analyze-fishbone",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("   => AI Fishbone Result successfully returned!")
            print(f"      Man: {len(data.get('man', []))}, Machine: {len(data.get('machine', []))}, Material: {len(data.get('material', []))}")
    except Exception as e:
        print("   => AI Fishbone Error:", e)

if __name__ == "__main__":
    test_capa()
