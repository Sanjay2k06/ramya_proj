import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.clustering_service import cluster_evidence_sources
from services.correlation_engine import correlate_evidence_and_entities
from services.risk_scorer import calculate_explainable_risk

def test_source_clustering_detects_syndicated_copies():
    # 3 evidence records: 1 original advisory, 1 identical syndicated copy, 1 independent report
    evidence = [
        {
            "id": "ev-01",
            "source_name": "Vendor Security Team",
            "source_url": "https://vendor.example.com/advisory/101",
            "original_content": "Critical RCE vulnerability discovered in OmniGateway v4.1 allowing unauthenticated remote code execution via buffer overflow in SSL listener.",
            "source_type": "vendor_advisory"
        },
        {
            "id": "ev-02",
            "source_name": "TechRepublish Blog",
            "source_url": "https://vendor.example.com/advisory/101", # Shared citation URL
            "original_content": "Critical RCE vulnerability discovered in OmniGateway v4.1 allowing unauthenticated remote code execution via buffer overflow in SSL listener.", # Identical text
            "source_type": "independent_blog"
        },
        {
            "id": "ev-03",
            "source_name": "CERT-CC National Advisory",
            "source_url": "https://cert.example.gov/bulletins/2026",
            "original_content": "US-CERT releases advisory regarding remote access gateway flaws with active network telemetry observed targeting port 8443.",
            "source_type": "cert_government"
        }
    ]

    res = cluster_evidence_sources(evidence)
    clusters = res["clusters"]
    clustered_ev = res["clustered_evidence"]

    assert len(clusters) == 2, "ev-01 and ev-02 should be clustered together into 1 cluster, ev-03 into another"
    
    # Check that ev-02 was marked as syndicated copy (not independent)
    ev_02_record = next(e for e in clustered_ev if e["id"] == "ev-02")
    assert ev_02_record["is_independent_source"] == 0
    assert "Syndicated" in ev_02_record["syndication_basis"]

    ev_01_record = next(e for e in clustered_ev if e["id"] == "ev-01")
    assert ev_01_record["is_independent_source"] == 1

def test_corroboration_ignores_syndicated_copies():
    # Entity reported by ev-01 and syndicated ev-02 should NOT be corroborated because they belong to same cluster!
    cluster_id_1 = "clust-vendor-group"
    cluster_id_2 = "clust-cert-group"

    evidence = [
        {"id": "ev-01", "source_name": "Vendor A", "cluster_id": cluster_id_1, "is_independent_source": 1},
        {"id": "ev-02", "source_name": "Copy Blog", "cluster_id": cluster_id_1, "is_independent_source": 0},
        {"id": "ev-03", "source_name": "CERT", "cluster_id": cluster_id_2, "is_independent_source": 1}
    ]

    entities = [
        {"id": "ent-cve", "value": "CVE-2026-8901", "normalized_value": "cve-2026-8901", "entity_type": "cve"}
    ]

    # Claim 1 only reported by cluster 1 (ev-01 & ev-02) -> Should NOT be corroborated
    claims_single_cluster = [
        {"id": "cl-1", "evidence_id": "ev-01", "subject": "CVE-2026-8901", "predicate": "AFFECTS", "object": "OmniGateway"},
        {"id": "cl-2", "evidence_id": "ev-02", "subject": "CVE-2026-8901", "predicate": "AFFECTS", "object": "OmniGateway"}
    ]

    res_single = correlate_evidence_and_entities(entities, claims_single_cluster, evidence)
    assert res_single["corroborated_count"] == 0, "Syndicated copy from same cluster must not trigger corroboration"

    # Claim 2 reported by cluster 1 and cluster 2 -> SHOULD be corroborated!
    claims_multi_cluster = [
        {"id": "cl-1", "evidence_id": "ev-01", "subject": "CVE-2026-8901", "predicate": "AFFECTS", "object": "OmniGateway"},
        {"id": "cl-3", "evidence_id": "ev-03", "subject": "CVE-2026-8901", "predicate": "AFFECTS", "object": "OmniGateway"}
    ]
    res_multi = correlate_evidence_and_entities(entities, claims_multi_cluster, evidence)
    assert res_multi["corroborated_count"] == 2, "Genuinely independent clusters must corroborate"

def test_decoupled_risk_scoring_and_evidence_gap_safeguard():
    # Critical RCE vulnerability with NO exploit PoC in evidence stream
    evidence = [
        {
            "id": "ev-01",
            "source_type": "vendor_advisory",
            "normalized_content": "Vendor confirms critical CVSS 9.8 remote code execution vulnerability CVE-2026-9999. No public proof-of-concept exists yet."
        }
    ]
    entities = [
        {"id": "e-1", "entity_type": "cve", "value": "CVE-2026-9999"}
    ]
    claims = [
        {"id": "c-1", "subject": "CVE-2026-9999", "is_corroborated": 0}
    ]
    conflicts = []

    risk = calculate_explainable_risk(evidence, entities, claims, conflicts)

    # 1. Operational priority must NOT drop below HIGH (safeguard floor >= 65.0)
    assert risk["overall_priority_score"] >= 65.0
    assert risk["priority_category"] in ("HIGH", "CRITICAL")

    # 2. Uncertainty flag for missing PoC must be explicitly set
    assert "UNCONFIRMED_EXPLOITATION_POC" in risk["uncertainty_flags"]

    # 3. Decoupled metrics must exist and be distinct
    assert "evidence_confidence" in risk
    assert "evidence_completeness" in risk
    assert "conflict_status" in risk
    assert risk["conflict_status"] == "CONSISTENT"
