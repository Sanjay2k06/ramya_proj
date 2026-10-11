import uuid
import json
from typing import List, Dict, Any

def generate_defensive_recommendations(
    investigation_id: str,
    evidence_list: List[Dict[str, Any]],
    entities: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]],
    risk_assessment: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Produce concrete, evidence-backed defensive actions with lifecycle status tracking."""
    recs = []

    # 1. Recommendation for Conflicts (Priority: CRITICAL if conflict exists)
    for conf in conflicts:
        recs.append({
            "id": f"rec-{uuid.uuid4().hex[:10]}",
            "investigation_id": investigation_id,
            "priority": "CRITICAL" if conf.get("conflict_type") in ("version_discrepancy", "incident_veracity_conflict") else "HIGH",
            "title": f"Resolve Conflict: {conf['conflict_type'].replace('_', ' ').title()}",
            "reason": conf["reason"],
            "related_finding": f"Contradiction between {conf['source_a']} and {conf['source_b']}",
            "supporting_evidence_ids": conf.get("supporting_evidence", "[]"),
            "verification_steps": conf.get("recommended_verification") or "Cross-reference official vendor patch manifests and network telemetry.",
            "expected_benefit": "Prevents false-alarm containment outages and clarifies operational vulnerability scope.",
            "confidence": conf.get("confidence", 0.85),
            "status": "pending"
        })

    # 2. Recommendations for Extracted IOCs (IPs and Hashes)
    ips = [e for e in entities if e["entity_type"] == "ip"]
    if ips:
        ip_vals = [ip["value"] for ip in ips[:5]]
        ev_ids = [e["id"] for e in evidence_list if any(ip in (e.get("normalized_content") or "") for ip in ip_vals)]
        recs.append({
            "id": f"rec-{uuid.uuid4().hex[:10]}",
            "investigation_id": investigation_id,
            "priority": "HIGH",
            "title": f"Deploy Telemetry Threat Hunt for {len(ips)} Network Indicator(s)",
            "reason": f"Active threat actors or infrastructure associated with IPs: {', '.join(ip_vals)}.",
            "related_finding": "Identified command-and-control / exfiltration egress indicators.",
            "supporting_evidence_ids": json.dumps(ev_ids[:3]),
            "verification_steps": f"Query SIEM/EDR firewall egress logs for connections to {', '.join(ip_vals)} over the past 30 days.",
            "expected_benefit": "Enables rapid containment of potential active compromised internal sessions.",
            "confidence": 0.90,
            "status": "pending"
        })

    # 3. Recommendations for Vulnerabilities / Patching
    cves = [e for e in entities if e["entity_type"] == "cve"]
    for cve in cves:
        cve_val = cve["value"]
        ev_ids = [e["id"] for e in evidence_list if cve_val in (e.get("normalized_content") or "")]
        recs.append({
            "id": f"rec-{uuid.uuid4().hex[:10]}",
            "investigation_id": investigation_id,
            "priority": "CRITICAL" if risk_assessment.get("priority_category") in ("CRITICAL", "HIGH") else "MEDIUM",
            "title": f"Validate Asset Exposure & Apply Firmware Patch for {cve_val}",
            "reason": f"Vulnerability {cve_val} is implicated in weaponized exploitation or proof-of-concept intelligence.",
            "related_finding": f"High-risk vulnerability identified: {cve_val}",
            "supporting_evidence_ids": json.dumps(ev_ids[:3]),
            "verification_steps": f"Scan internal CMDB/vulnerability management tools for affected assets. Confirm patch availability from authoritative vendor bulletin.",
            "expected_benefit": "Closes verified remote attack vectors and blocks weaponized exploit payloads.",
            "confidence": 0.92,
            "status": "pending"
        })

    # 4. Recommendation for Attribution Caution
    actors = [e for e in entities if e["entity_type"] == "actor"]
    if len(actors) >= 2:
        recs.append({
            "id": f"rec-{uuid.uuid4().hex[:10]}",
            "investigation_id": investigation_id,
            "priority": "MEDIUM",
            "title": "Hold Adversary Attribution as Provisional Pending Multi-Source Telemetry",
            "reason": f"Multiple threat actors ({', '.join(a['value'] for a in actors[:3])}) are referenced in divergent intelligence reports.",
            "related_finding": "Divergent or disputed adversary attribution in open source CTI.",
            "supporting_evidence_ids": json.dumps([e["id"] for e in evidence_list[:2]]),
            "verification_steps": "Compare malware compile timestamps and TTPs against MITRE ATT&CK enterprise matrices rather than relying on single blog reports.",
            "expected_benefit": "Avoids strategic false-attribution and focuses operational resources on tactical indicators.",
            "confidence": 0.85,
            "status": "pending"
        })

    return recs
