import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_full_e2e_forensic_pipeline_smoke(client):
    # 1. Login with seeded or newly registered analyst
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "analyst_demo",
        "password": "TemporalForensics2026!"
    })
    assert login_resp.status_code == 200
    token = login_resp.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check Dashboard Summary
    dash_resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.get_json()
    assert "metrics" in dash_data
    assert dash_data["metrics"]["total_investigations"] >= 1

    # 3. Create a fresh investigation with synthetic benchmark
    create_resp = client.post("/api/v1/investigations", headers=headers, json={
        "title": "Automated E2E Verification Investigation",
        "description": "Validating full 12-stage pipeline in automated test environment",
        "objective": "defensive_prioritization",
        "dataset_source": "synthetic_benchmark",
        "use_gemini": False,
        "auto_analyze": True
    })
    assert create_resp.status_code == 201
    inv_id = create_resp.get_json()["investigation_id"]

    # 4. Check Investigation Overview
    inv_resp = client.get(f"/api/v1/investigations/{inv_id}", headers=headers)
    assert inv_resp.status_code == 200
    inv_data = inv_resp.get_json()
    assert inv_data["summary"]["evidence_count"] >= 5
    assert inv_data["investigation"]["status"] == "completed"

    # 5. Retrieve Evidence
    ev_resp = client.get(f"/api/v1/investigations/{inv_id}/evidence", headers=headers)
    assert ev_resp.status_code == 200
    assert len(ev_resp.get_json()["evidence"]) >= 5

    # 6. Retrieve Timeline
    time_resp = client.get(f"/api/v1/investigations/{inv_id}/timeline", headers=headers)
    assert time_resp.status_code == 200
    assert "timeline_events" in time_resp.get_json()

    # 7. Retrieve Knowledge Graph
    graph_resp = client.get(f"/api/v1/investigations/{inv_id}/graph", headers=headers)
    assert graph_resp.status_code == 200
    g_data = graph_resp.get_json()
    assert len(g_data["nodes"]) >= 5
    assert len(g_data["edges"]) >= 3

    # 8. Retrieve Conflicts
    conf_resp = client.get(f"/api/v1/investigations/{inv_id}/conflicts", headers=headers)
    assert conf_resp.status_code == 200
    assert conf_resp.get_json()["count"] >= 1

    # 9. Retrieve Risk Assessment
    risk_resp = client.get(f"/api/v1/investigations/{inv_id}/risk", headers=headers)
    assert risk_resp.status_code == 200
    risk_data = risk_resp.get_json()
    assert "overall_priority_score" in risk_data
    assert len(risk_data["components"]) >= 4

    # 10. Retrieve Recommendations & Update status
    recs_resp = client.get(f"/api/v1/investigations/{inv_id}/recommendations", headers=headers)
    assert recs_resp.status_code == 200
    recs = recs_resp.get_json()["recommendations"]
    assert len(recs) >= 1
    rec_id = recs[0]["id"]

    patch_rec_resp = client.patch(f"/api/v1/investigations/recommendations/{rec_id}", headers=headers, json={
        "status": "accepted"
    })
    assert patch_rec_resp.status_code == 200

    # 11. Retrieve Reasoning
    reason_resp = client.get(f"/api/v1/investigations/{inv_id}/reasoning", headers=headers)
    assert reason_resp.status_code == 200
    assert len(reason_resp.get_json()["reasoning"]) >= 1

    # 12. Retrieve Time-to-Exploit
    tte_resp = client.get(f"/api/v1/investigations/{inv_id}/time-to-exploit", headers=headers)
    assert tte_resp.status_code == 200

    # 13. Download Report in JSON, CSV, and HTML formats
    rep_json = client.get(f"/api/v1/reports/{inv_id}/download?format=json", headers=headers)
    assert rep_json.status_code == 200

    rep_csv = client.get(f"/api/v1/reports/{inv_id}/download?format=csv", headers=headers)
    assert rep_csv.status_code == 200
    assert "TEMPORAL CTI FORENSICS" in rep_csv.get_data(as_text=True)

    rep_html = client.get(f"/api/v1/reports/{inv_id}/download?format=html", headers=headers)
    assert rep_html.status_code == 200
    assert "OFFICIAL DOSSIER" in rep_html.get_data(as_text=True)

    # 14. Health and Settings
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200
    ready_resp = client.get("/api/v1/health/ready")
    assert ready_resp.status_code == 200
