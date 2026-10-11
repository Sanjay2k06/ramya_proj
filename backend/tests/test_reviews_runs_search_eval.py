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

def test_reviews_runs_eval_and_search_endpoints(client):
    # 1. Login
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "analyst_demo",
        "password": "TemporalForensics2026!"
    })
    assert login_resp.status_code == 200
    token = login_resp.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get existing sample investigation
    inv_resp = client.get("/api/v1/investigations", headers=headers)
    assert inv_resp.status_code == 200
    invs = inv_resp.get_json()["investigations"]
    assert len(invs) >= 1
    inv_id = invs[0]["id"]

    # 3. Test Source Clusters Endpoint
    cluster_resp = client.get(f"/api/v1/investigations/{inv_id}/clusters", headers=headers)
    assert cluster_resp.status_code == 200
    c_data = cluster_resp.get_json()
    assert "clusters" in c_data
    assert "total_clusters" in c_data

    # 4. Test Human-in-the-Loop Finding Review
    finding_id = "claim-synth-01"
    review_resp = client.post(f"/api/v1/investigations/{inv_id}/findings/{finding_id}/review", headers=headers, json={
        "finding_topic": "OmniGateway RCE Exploit Attribution",
        "review_status": "SUPPORTED",
        "justification": "Verified against network honeypot PCAP captures showing matching payload headers."
    })
    assert review_resp.status_code == 201
    rev_data = review_resp.get_json()
    assert rev_data["review_status"] == "SUPPORTED"
    assert rev_data["reviewer"] == "analyst_demo"

    # Verify review list
    list_rev_resp = client.get(f"/api/v1/investigations/{inv_id}/findings/reviews", headers=headers)
    assert list_rev_resp.status_code == 200
    reviews = list_rev_resp.get_json()["reviews"]
    assert any(r["finding_id"] == finding_id for r in reviews)

    # 5. Test Analysis Runs & Run Comparison
    runs_resp = client.get(f"/api/v1/investigations/{inv_id}/runs", headers=headers)
    assert runs_resp.status_code == 200
    runs = runs_resp.get_json()["runs"]
    assert len(runs) >= 1
    run_a = runs[0]["id"]

    # Trigger a 2nd pipeline run to get a 2nd snapshot
    pipe_resp = client.post(f"/api/v1/investigations/{inv_id}/pipeline", headers=headers, json={"use_gemini": False})
    assert pipe_resp.status_code == 200

    runs_after = client.get(f"/api/v1/investigations/{inv_id}/runs", headers=headers).get_json()["runs"]
    assert len(runs_after) >= 2
    run_b = runs_after[0]["id"]

    # Test compare runs
    compare_resp = client.get(f"/api/v1/investigations/{inv_id}/runs/compare?run_a={run_a}&run_b={run_b}", headers=headers)
    assert compare_resp.status_code == 200
    comp_data = compare_resp.get_json()["comparison"]
    assert "deltas" in comp_data
    assert "score_delta" in comp_data["deltas"]

    # 6. Test Evaluation Laboratory Endpoint
    eval_resp = client.get("/api/v1/evaluation/benchmark", headers=headers)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.get_json()
    assert "classification_metrics" in eval_data
    assert "confusion_matrix" in eval_data["classification_metrics"]
    assert "ranking_metrics" in eval_data
    assert "proposed_framework" in eval_data["ranking_metrics"]
    assert eval_data["classification_metrics"]["f1_score"] >= 0.50

    # 7. Test Cross-Evidence Workspace Search
    search_resp = client.get("/api/v1/search?q=DarkHydra", headers=headers)
    assert search_resp.status_code == 200
    s_data = search_resp.get_json()
    assert s_data["total_matches"] >= 1
    assert "evidence" in s_data["results"]
