import uuid
import json
from typing import List, Dict, Any

def detect_cti_conflicts(
    claims: List[Dict[str, Any]],
    evidence_list: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Detect deterministic and semantic conflicts between claims across independent sources."""
    conflicts: List[Dict[str, Any]] = []
    ev_map = {e["id"]: e for e in evidence_list}

    # Group claims by shared entity (subject or object)
    entity_claim_map: Dict[str, List[Dict[str, Any]]] = {}
    for c in claims:
        subj = (c.get("subject") or "").strip().lower()
        obj = (c.get("object") or "").strip().lower()
        if subj:
            entity_claim_map.setdefault(subj, []).append(c)
        if obj and obj != subj:
            entity_claim_map.setdefault(obj, []).append(c)

    seen_pairs = set()

    # Rule 1: Contradictory Predicates on Same Entity (e.g., UNAFFECTED_BY vs EXPLOITS or TARGETS)
    for ent, c_list in entity_claim_map.items():
        if len(c_list) < 2:
            continue
        for i, c1 in enumerate(c_list):
            for c2 in c_list[i+1:]:
                # Only check claims from distinct evidence records
                if c1.get("evidence_id") == c2.get("evidence_id"):
                    continue
                pair_key = tuple(sorted([c1["id"], c2["id"]]))
                if pair_key in seen_pairs:
                    continue

                ev1 = ev_map.get(c1.get("evidence_id"), {})
                ev2 = ev_map.get(c2.get("evidence_id"), {})

                # Check if one claims unaffected and other claims exploits
                preds = {c1.get("predicate"), c2.get("predicate")}
                if "UNAFFECTED_BY" in preds and ("EXPLOITS" in preds or "TARGETS" in preds):
                    seen_pairs.add(pair_key)
                    c1["is_contradicted"] = 1
                    c2["is_contradicted"] = 1
                    conflicts.append({
                        "id": f"conf-{uuid.uuid4().hex[:10]}",
                        "investigation_id": c1.get("investigation_id") or ev1.get("investigation_id") or "inv-default",
                        "claim_a_id": c1["id"],
                        "claim_b_id": c2["id"],
                        "claim_a_text": c1["claim_text"],
                        "claim_b_text": c2["claim_text"],
                        "source_a": ev1.get("source_name", "Source A"),
                        "source_b": ev2.get("source_name", "Source B"),
                        "timestamp_a": c1.get("event_time") or ev1.get("source_timestamp"),
                        "timestamp_b": c2.get("event_time") or ev2.get("source_timestamp"),
                        "conflict_type": "version_discrepancy",
                        "reason": f"Discrepancy in vulnerability applicability regarding '{ent.upper()}': one source claims software is vulnerable/exploited while vendor advisory asserts it is unaffected or patched.",
                        "supporting_evidence": json.dumps([ev1.get("id"), ev2.get("id")]),
                        "confidence": 0.88,
                        "review_status": "pending",
                        "analyst_notes": "",
                        "recommended_verification": f"Inspect vendor release notes and git advisory hashes for '{ent}'. Audit installed package versions on boundary endpoints."
                    })

                # Rule 2: Explicit Refutation / Denial (Predicate CONTRADICTS)
                elif "CONTRADICTS" in preds:
                    seen_pairs.add(pair_key)
                    c1["is_contradicted"] = 1
                    c2["is_contradicted"] = 1
                    conflicts.append({
                        "id": f"conf-{uuid.uuid4().hex[:10]}",
                        "investigation_id": c1.get("investigation_id") or ev1.get("investigation_id") or "inv-default",
                        "claim_a_id": c1["id"],
                        "claim_b_id": c2["id"],
                        "claim_a_text": c1["claim_text"],
                        "claim_b_text": c2["claim_text"],
                        "source_a": ev1.get("source_name", "Source A"),
                        "source_b": ev2.get("source_name", "Source B"),
                        "timestamp_a": c1.get("event_time") or ev1.get("source_timestamp"),
                        "timestamp_b": c2.get("event_time") or ev2.get("source_timestamp"),
                        "conflict_type": "incident_veracity_conflict",
                        "reason": f"Direct evidentiary contradiction regarding claim validity. Source '{ev2.get('source_name')}' formally challenges the authenticity of claims made by '{ev1.get('source_name')}'.",
                        "supporting_evidence": json.dumps([ev1.get("id"), ev2.get("id")]),
                        "confidence": 0.92,
                        "review_status": "pending",
                        "analyst_notes": "",
                        "recommended_verification": "Conduct internal forensic disk and egress telemetry audits to independently confirm or refute purported exfiltration."
                    })

    # Rule 3: Conflicting Attribution on Shared Infrastructure (IP or Domain)
    ip_attribution_map: Dict[str, List[Dict[str, Any]]] = {}
    for c in claims:
        # If predicate is INDICATES or ATTRIBUTED_TO
        if c.get("predicate") in ("INDICATES", "ATTRIBUTED_TO", "DEPLOYS"):
            obj = (c.get("object") or "").strip()
            subj = (c.get("subject") or "").strip()
            # If object looks like an IP
            if "." in obj:
                ip_attribution_map.setdefault(obj, []).append(c)
            elif "." in subj:
                ip_attribution_map.setdefault(subj, []).append(c)

    for ip_val, c_list in ip_attribution_map.items():
        if len(c_list) >= 2:
            for i, c1 in enumerate(c_list):
                for c2 in c_list[i+1:]:
                    if c1.get("evidence_id") == c2.get("evidence_id"):
                        continue
                    # Check if subjects are different threat actors
                    s1 = (c1.get("subject") or "").strip().lower()
                    s2 = (c2.get("subject") or "").strip().lower()
                    if s1 != s2 and s1 and s2 and not any(p in (s1, s2) for p in ("traffic", "malware")):
                        pair_key = tuple(sorted([c1["id"], c2["id"]]))
                        if pair_key not in seen_pairs:
                            seen_pairs.add(pair_key)
                            c1["is_contradicted"] = 1
                            c2["is_contradicted"] = 1
                            ev1 = ev_map.get(c1.get("evidence_id"), {})
                            ev2 = ev_map.get(c2.get("evidence_id"), {})
                            conflicts.append({
                                "id": f"conf-{uuid.uuid4().hex[:10]}",
                                "investigation_id": c1.get("investigation_id") or ev1.get("investigation_id") or "inv-default",
                                "claim_a_id": c1["id"],
                                "claim_b_id": c2["id"],
                                "claim_a_text": c1["claim_text"],
                                "claim_b_text": c2["claim_text"],
                                "source_a": ev1.get("source_name", "Source A"),
                                "source_b": ev2.get("source_name", "Source B"),
                                "timestamp_a": c1.get("event_time") or ev1.get("source_timestamp"),
                                "timestamp_b": c2.get("event_time") or ev2.get("source_timestamp"),
                                "conflict_type": "attribution_conflict",
                                "reason": f"Divergent adversary attribution on shared infrastructure {ip_val}. '{ev1.get('source_name')}' attributes activity to {c1.get('subject')}, whereas '{ev2.get('source_name')}' attributes it to {c2.get('subject')}.",
                                "supporting_evidence": json.dumps([ev1.get("id"), ev2.get("id")]),
                                "confidence": 0.85,
                                "review_status": "pending",
                                "analyst_notes": "",
                                "recommended_verification": "Review BGP routing history, hosting ASN overlaps, and reverse DNS records for co-tenancy vs intentional false-flag misdirection."
                            })

    return conflicts
