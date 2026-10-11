from datetime import datetime
from typing import List, Dict, Any

def analyze_temporal_sequence(claims: List[Dict[str, Any]], evidence_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze temporal chronology and identify temporal inconsistencies."""
    events = []
    anomalies = []

    # Map evidence by id
    ev_map = {e["id"]: e for e in evidence_list}

    for claim in claims:
        ev = ev_map.get(claim.get("evidence_id"), {})
        
        event_time = claim.get("event_time")
        pub_time = claim.get("publication_time") or ev.get("source_timestamp")
        coll_time = claim.get("collection_time") or ev.get("collection_timestamp")

        events.append({
            "id": f"evt-{claim['id']}",
            "claim_id": claim["id"],
            "evidence_id": claim.get("evidence_id"),
            "source_name": ev.get("source_name", "Unknown Source"),
            "title": claim.get("claim_text", "")[:90],
            "description": claim.get("supporting_excerpt", ""),
            "subject": claim.get("subject"),
            "predicate": claim.get("predicate"),
            "object": claim.get("object"),
            "event_time": event_time,
            "publication_time": pub_time,
            "collection_time": coll_time,
            "has_unknown_time": not bool(event_time),
            "threat_category": ev.get("threat_category", "general_intel"),
            "confidence": claim.get("confidence", 0.7),
            "is_contradicted": claim.get("is_contradicted", 0)
        })

    # Sort chronological events where timestamp exists
    events_with_time = [e for e in events if e["event_time"]]
    events_with_time.sort(key=lambda x: x["event_time"])
    
    events_unknown = [e for e in events if not e["event_time"]]

    # Check for temporal anomalies (e.g., Vendor released patch before claimed zero-day intrusion date)
    for i, e1 in enumerate(events_with_time):
        for e2 in events_with_time[i+1:]:
            # If e1 is an exploit claim happening AFTER e2 which is a patch release stating unaffected
            if e1["predicate"] == "UNAFFECTED_BY" and e2["predicate"] == "EXPLOITS":
                if e1["object"] == e2["object"]:  # Same CVE or Asset
                    anomalies.append({
                        "type": "temporal_retroactive_exploit_claim",
                        "event_a_id": e1["id"],
                        "event_b_id": e2["id"],
                        "description": f"Patch/advisory published on {e1['event_time']} prior to alleged zero-day attack on {e2['event_time']}.",
                        "evidence_ids": [e1["evidence_id"], e2["evidence_id"]]
                    })

    return {
        "timeline_events": events_with_time + events_unknown,
        "total_events": len(events),
        "dated_events": len(events_with_time),
        "undated_events": len(events_unknown),
        "temporal_anomalies": anomalies
    }
