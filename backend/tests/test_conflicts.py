import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.conflict_detector import detect_cti_conflicts

def test_detect_version_discrepancy():
    claims = [
        {
            "id": "c1", "investigation_id": "inv-1", "evidence_id": "ev-1",
            "claim_text": "OmniGateway v4.2 exploited via CVE-2026-SYNTH-8901",
            "subject": "OmniGateway v4.2", "predicate": "EXPLOITS", "object": "CVE-2026-SYNTH-8901",
            "event_time": "2026-02-15T00:00:00Z"
        },
        {
            "id": "c2", "investigation_id": "inv-1", "evidence_id": "ev-2",
            "claim_text": "OmniGateway v4.2 is unaffected by CVE-2026-SYNTH-8901 and patched",
            "subject": "OmniGateway v4.2", "predicate": "UNAFFECTED_BY", "object": "CVE-2026-SYNTH-8901",
            "event_time": "2026-01-10T00:00:00Z"
        }
    ]
    evidence_list = [
        {"id": "ev-1", "source_name": "Blog A", "source_timestamp": "2026-02-15T00:00:00Z"},
        {"id": "ev-2", "source_name": "Vendor Advisory", "source_timestamp": "2026-01-10T00:00:00Z"}
    ]

    conflicts = detect_cti_conflicts(claims, evidence_list)
    assert len(conflicts) >= 1
    assert conflicts[0]["conflict_type"] == "version_discrepancy"
    assert conflicts[0]["source_a"] in ("Blog A", "Vendor Advisory")

def test_detect_attribution_conflict():
    claims = [
        {
            "id": "c3", "investigation_id": "inv-1", "evidence_id": "ev-3",
            "claim_text": "Traffic originated from 198.51.100.45 attributed to APT-SYNTH-99",
            "subject": "APT-SYNTH-99", "predicate": "INDICATES", "object": "198.51.100.45",
            "event_time": "2026-03-01T00:00:00Z"
        },
        {
            "id": "c4", "investigation_id": "inv-1", "evidence_id": "ev-4",
            "claim_text": "Traffic from 198.51.100.45 attributed to VoltPhantom",
            "subject": "VoltPhantom", "predicate": "ATTRIBUTED_TO", "object": "198.51.100.45",
            "event_time": "2026-03-02T00:00:00Z"
        }
    ]
    evidence_list = [
        {"id": "ev-3", "source_name": "Vendor X", "source_timestamp": "2026-03-01T00:00:00Z"},
        {"id": "ev-4", "source_name": "CERT Y", "source_timestamp": "2026-03-02T00:00:00Z"}
    ]

    conflicts = detect_cti_conflicts(claims, evidence_list)
    assert any(c["conflict_type"] == "attribution_conflict" for c in conflicts)
