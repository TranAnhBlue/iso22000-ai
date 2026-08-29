import json
import urllib.request
import urllib.error
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api/v1/audits"

def request_json(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTPError: {e.code}, body: {err_body}")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}
    except Exception as ex:
        print(f"General error connecting to {url}: {ex}")
        return 500, {"error": str(ex)}

def test_audit_endpoints():
    print("[TEST] Bat dau kiem thu Module Danh gia noi bo, Dao tao & Khai bao suc khoe...")

    # 1. Seed Defaults
    print("\n1. Test Seed Defaults:")
    status, res = request_json(f"{BASE_URL}/seed-defaults", method="POST")
    print(f"Status: {status}, Response: {res}")
    assert status == 200

    # 2. Get Stats
    print("\n2. Test Get Stats:")
    status, stats = request_json(f"{BASE_URL}/stats")
    print(f"Status: {status}, Stats: {stats}")
    assert status == 200
    assert stats["total_audits"] >= 3
    assert stats["total_courses"] >= 4
    assert stats["total_health_declarations"] >= 5

    # 3. List Audits
    print("\n3. Test List Audits:")
    status, audits = request_json(f"{BASE_URL}/audits")
    print(f"Status: {status}, Audits count: {len(audits)}")
    assert status == 200
    # Find audit with total_findings > 0
    audit = next((a for a in audits if a.get("total_findings", 0) > 0), audits[0])
    audit_id = audit["audit_id"]

    # 4. List Findings
    print(f"\n4. Test List Findings for audit {audit_id}:")
    status, findings = request_json(f"{BASE_URL}/audits/{audit_id}/findings")
    print(f"Status: {status}, Findings count: {len(findings)}")
    assert status == 200

    # 5. Convert Finding to NC
    if findings:
        target_f = findings[0]
        f_id = target_f["finding_id"]
        print(f"\n5. Test Convert Finding {f_id} to NC:")
        status, res = request_json(f"{BASE_URL}/findings/{f_id}/convert-to-nc", method="POST")
        print(f"Status: {status}, Response: {res}")
        assert status == 200

    # 6. List Courses & Participants
    print("\n6. Test List Training Courses:")
    status, courses = request_json(f"{BASE_URL}/training/courses")
    print(f"Status: {status}, Courses count: {len(courses)}")
    assert status == 200
    course = next((c for c in courses if c.get("total_participants", 0) > 0), courses[0])
    course_id = course["course_id"]

    status, participants = request_json(f"{BASE_URL}/training/courses/{course_id}/participants")
    print(f"Status: {status}, Participants count: {len(participants)}")
    assert status == 200

    # 7. List Health Declarations
    print("\n7. Test List Health Declarations:")
    status, declarations = request_json(f"{BASE_URL}/health-declarations")
    print(f"Status: {status}, Declarations count: {len(declarations)}")
    assert status == 200

    # 8. Test AI Endpoints
    print("\n8. Test AI Checklist Generator:")
    status, res = request_json(f"{BASE_URL}/ai/generate-checklist", method="POST", data={"clause_or_dept": "8.5 HACCP"})
    print(f"Status: {status}, Questions generated: {len(res['suggested_questions'])}")
    assert status == 200

    print("\n9. Test AI Finding Evaluator:")
    status, res = request_json(f"{BASE_URL}/ai/evaluate-finding", method="POST", data={"finding_text": "Phát hiện mảnh kim loại rỉ sét trong phễu nạp liệu"})
    print(f"Status: {status}, Classification: {res['suggested_classification']}")
    assert status == 200
    assert res["suggested_classification"] == "MAJOR_NC"

    print("\n10. Test AI Quiz Generator:")
    status, res = request_json(f"{BASE_URL}/ai/generate-quiz", method="POST", data={"topic": "HACCP & CCP"})
    print(f"Status: {status}, Quiz questions: {len(res['questions'])}")
    assert status == 200

    print("\n11. Test AI Health Risk Scanner:")
    status, res = request_json(f"{BASE_URL}/ai/scan-health-risk", method="POST", data={})
    print(f"Status: {status}, Risk level: {res['risk_level']}, Suspended: {res['suspended_count']}")
    assert status == 200

    print("\n[SUCCESS] TAT CA CAC KIEM THU BACKEND MODULE AUDITS DEU DAT 100% (200 OK)!")

if __name__ == "__main__":
    test_audit_endpoints()
