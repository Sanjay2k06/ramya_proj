from typing import List, Dict, Any

def correlate_evidence_and_entities(
    entities: List[Dict[str, Any]],
    claims: List[Dict[str, Any]],
    evidence_list: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Correlate entities across independent sources and generate relationship edges."""
    relationships = []
    entity_by_val = {}
    
    # Index entities by normalized value
    for ent in entities:
        norm = ent["normalized_value"]
        if norm not in entity_by_val:
            entity_by_val[norm] = ent

    # Cluster-to-claim grouping to enforce TRUE source independence
    entity_clusters: Dict[str, set] = {}
    ev_map = {e["id"]: e for e in evidence_list}

    for claim in claims:
        ev = ev_map.get(claim.get("evidence_id"), {})
        # Group by cluster_id if available, fallback to unique source name
        cluster_key = ev.get("cluster_id") or ev.get("source_name", "Unknown")
        
        subj = (claim.get("subject") or "").strip()
        obj = (claim.get("object") or "").strip()

        if subj:
            entity_clusters.setdefault(subj.lower(), set()).add(cluster_key)
        if obj:
            entity_clusters.setdefault(obj.lower(), set()).add(cluster_key)

        # Create relationship edge between subject and object if both exist
        ent_subj = entity_by_val.get(subj.lower())
        ent_obj = entity_by_val.get(obj.lower())

        if ent_subj and ent_obj and ent_subj["id"] != ent_obj["id"]:
            relationships.append({
                "source_entity_id": ent_subj["id"],
                "target_entity_id": ent_obj["id"],
                "source_name": ent_subj["value"],
                "target_name": ent_obj["value"],
                "relationship_type": claim.get("predicate", "MENTIONS"),
                "weight": 1.0,
                "evidence_id": claim.get("evidence_id"),
                "description": claim.get("claim_text", ""),
                "timestamp": claim.get("event_time")
            })

    # Flag corroborated claims ONLY when subject or object is reported by 2+ genuinely independent source clusters
    for claim in claims:
        subj = (claim.get("subject") or "").lower()
        obj = (claim.get("object") or "").lower()
        clusters = entity_clusters.get(subj, set()) | entity_clusters.get(obj, set())
        # Must have at least 2 distinct independent clusters
        if len(clusters) >= 2:
            claim["is_corroborated"] = 1
        else:
            claim["is_corroborated"] = 0

    return {
        "relationships": relationships,
        "corroborated_count": sum(1 for c in claims if c.get("is_corroborated", 0) == 1)
    }

