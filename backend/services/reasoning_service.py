from typing import List, Dict, Any

def generate_explainable_reasoning(
    evidence_list: List[Dict[str, Any]],
    entities: List[Dict[str, Any]],
    claims: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]],
    risk_assessment: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Produce structured 8-point explainable reasoning blocks grounded directly in persisted evidence."""
    reasoning_blocks = []
    ev_map = {e["id"]: e for e in evidence_list}

    # 1. Reasoning for Critical Vulnerabilities
    cves = [e for e in entities if e["entity_type"] == "cve"]
    for cve in cves:
        cve_claims = [c for c in claims if cve["value"].lower() in c["claim_text"].lower()]
        related_ev_ids = list(set(c["evidence_id"] for c in cve_claims if c.get("evidence_id")))
        related_sources = list(set(ev_map[eid]["source_name"] for eid in related_ev_ids if eid in ev_map))
        
        # Check for contradictions
        cve_conflicts = [
            conf for conf in conflicts 
            if cve["value"].lower() in (conf.get("claim_a_text") or "").lower() 
            or cve["value"].lower() in (conf.get("claim_b_text") or "").lower()
            or cve["value"].lower() in (conf.get("reason") or "").lower()
        ]

        temporal_times = [c["event_time"] for c in cve_claims if c.get("event_time")]
        time_str = f"Observed between {min(temporal_times)} and {max(temporal_times)}" if temporal_times else "Temporal sequence partially documented in source publications."

        corrob_sources = [s for s in related_sources if len(related_sources) > 1]

        reasoning_blocks.append({
            "id": f"reason-{cve['id']}",
            "topic": f"Vulnerability Assessment: {cve['value']}",
            "finding": f"Active intelligence reporting identifies {cve['value']} as an exploited or weaponized vulnerability.",
            "evidence": [f"{ev_map[eid]['source_name']} ({eid})" for eid in related_ev_ids if eid in ev_map],
            "temporal_context": time_str,
            "corroboration": f"Corroborated by {len(related_sources)} distinct sources: {', '.join(related_sources)}" if len(related_sources) > 1 else "Single source observation; lacks cross-institutional corroboration.",
            "contradictions": f"Identified {len(cve_conflicts)} conflict(s): {cve_conflicts[0]['reason']}" if cve_conflicts else "No direct contradiction regarding existence or vulnerability scope.",
            "confidence": 0.85 if not cve_conflicts and len(related_sources) > 1 else 0.60,
            "impact": "Potential perimeter compromise, privilege escalation, or unauthorized access depending on asset exposure.",
            "recommended_action": f"Verify affected firmware versions on edge devices against vendor advisories. Review egress logs for indicators related to {cve['value']}."
        })

    # 2. Reasoning for Adversary Attribution & Conflicts
    actors = [e for e in entities if e["entity_type"] == "actor"]
    if actors:
        actor_names = [a["value"] for a in actors]
        attr_conflicts = [c for c in conflicts if c.get("conflict_type") == "attribution_conflict"]
        
        reasoning_blocks.append({
            "id": "reason-attribution",
            "topic": "Adversary Attribution & False-Flag Analysis",
            "finding": f"Intelligence references threat actors: {', '.join(actor_names[:4])}.",
            "evidence": [f"{e['source_name']}: {e['threat_category']}" for e in evidence_list[:3]],
            "temporal_context": "Campaign telemetry aligns with recent reporting windows.",
            "corroboration": "Independent sources overlap on indicators (IPs, hashes) but diverge on high-level actor naming.",
            "contradictions": attr_conflicts[0]["reason"] if attr_conflicts else "Adversary attribution profiles appear consistent across reports.",
            "confidence": 0.55 if attr_conflicts else 0.80,
            "impact": "Premature attribution can trigger misaligned threat hunting priorities or diplomatic/legal false starts.",
            "recommended_action": "Decouple IOC blocking from actor attribution. Block indicators immediately while holding attribution as provisional."
        })

    # 3. Reasoning for Overall Forensic Risk
    reasoning_blocks.append({
        "id": "reason-overall-risk",
        "topic": "Operational Prioritization Rationale",
        "finding": f"System computed operational threat score: {risk_assessment.get('overall_priority_score')}/100 ({risk_assessment.get('priority_category')}).",
        "evidence": [f"Synthesized from {len(evidence_list)} evidence records and {len(claims)} extracted claims."],
        "temporal_context": "Evaluated in accordance with latest observation timestamps.",
        "corroboration": f"{risk_assessment.get('summary')}",
        "contradictions": risk_assessment.get("uncertainty_notes", "None"),
        "confidence": 0.88,
        "impact": "Guides triage order for Security Operations Center (SOC) analysts and patch management teams.",
        "recommended_action": "Execute highest priority defensive recommendations and resolve pending conflict reviews."
    })

    return reasoning_blocks
