import json
import urllib.request
import urllib.error
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api/v1/dashboard"

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

def run_tests():
    print("[TEST] Bat dau kiem thu Phân Hệ Dashboard Dieu Hanh & Management Review (Phase 9)...")

    # 1. Test Seed Defaults
    print("\n1. Test Seed Defaults:")
    status, res = request_json(f"{BASE_URL}/seed-defaults", method="POST")
    print(f"Status: {status}, Response: {res}")
    assert status == 200

    # 2. Test Get Executive Overview Stats
    print("\n2. Test Get Executive Overview Stats:")
    status, stats = request_json(f"{BASE_URL}/overview-stats")
    print(f"Status: {status}, FSMS Health Score: {stats.get('overall_health_score')}%, Level: {stats.get('health_level')}")
    print(f"Radar Pillars: {stats.get('radar_pillars')}")
    assert status == 200
    assert "overall_health_score" in stats
    assert "radar_pillars" in stats
    assert "documents" in stats
    assert "haccp_ccp" in stats

    # 3. Test Get Executive Alerts
    print("\n3. Test Get Executive Alerts:")
    status, alerts = request_json(f"{BASE_URL}/executive-alerts")
    print(f"Status: {status}, Active Alerts Count: {len(alerts)}")
    assert status == 200
    assert isinstance(alerts, list)

    # 4. Test List Quality Objectives
    print("\n4. Test List Quality Objectives:")
    status, objs = request_json(f"{BASE_URL}/quality-objectives")
    print(f"Status: {status}, Objectives Count: {len(objs)}")
    assert status == 200
    assert len(objs) >= 5

    # 5. Test List Management Reviews
    print("\n5. Test List Management Reviews:")
    status, reviews = request_json(f"{BASE_URL}/management-reviews")
    print(f"Status: {status}, Reviews Count: {len(reviews)}")
    assert status == 200
    assert len(reviews) >= 1
    review_id = reviews[0]["review_id"]

    # 6. Test Get Single Management Review
    print(f"\n6. Test Get Single Management Review {review_id}:")
    status, rev = request_json(f"{BASE_URL}/management-reviews/{review_id}")
    print(f"Status: {status}, Title: {rev.get('title')}")
    assert status == 200

    # 7. Test AI Audit Readiness Forecast
    print("\n7. Test AI Audit Readiness Forecast:")
    status, readiness = request_json(f"{BASE_URL}/ai/audit-readiness-forecast", method="POST", data={"target_standard": "ISO 22000:2018"})
    print(f"Status: {status}, Readiness: {readiness.get('readiness_percentage')}%, Top Risks: {len(readiness.get('top_critical_risks', []))}")
    assert status == 200
    assert "readiness_percentage" in readiness

    # 8. Test AI Generate Management Review Report
    print("\n8. Test AI Generate Management Review Report:")
    status, mr_report = request_json(f"{BASE_URL}/ai/generate-management-review-report", method="POST", data={"review_period": "Quý 1/2026"})
    print(f"Status: {status}, Title: {mr_report.get('report_title')}")
    assert status == 200
    assert "full_markdown_report" in mr_report

    # 9. Test AI Query FSMS Insights
    print("\n9. Test AI Query FSMS Insights:")
    status, insights = request_json(f"{BASE_URL}/ai/query-fsms-insights", method="POST", data={"question": "Phân tích tình hình kiểm soát các điểm CCP trong kỳ vừa qua?"})
    print(f"Status: {status}, Answer: {insights.get('answer')[:100]}...")
    assert status == 200
    assert "answer" in insights

    # 10. Test AI Suggest Quality Objectives
    print("\n10. Test AI Suggest Quality Objectives:")
    status, sug_objs = request_json(f"{BASE_URL}/ai/suggest-quality-objectives", method="POST", data={"target_year": 2026})
    print(f"Status: {status}, Suggested Count: {len(sug_objs.get('suggested_objectives', []))}")
    assert status == 200
    assert len(sug_objs.get("suggested_objectives", [])) > 0

    print("\n[SUCCESS] TAT CA CAC KIEM THU BACKEND PHAN HE DASHBOARD (PHASE 9) DEU DAT 100% (200 OK)!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"[FAILED] Loi kiem thu: {e}")
        sys.exit(1)
