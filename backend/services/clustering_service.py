import re
import uuid
import json
from typing import List, Dict, Any, Set
from urllib.parse import urlparse

def _tokenize_shingles(text: str, k: int = 3) -> Set[str]:
    """Tokenize text into lowercase word tokens and produce k-word shingles."""
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    tokens = [t for t in cleaned.split() if len(t) > 2]
    if len(tokens) < k:
        return set(tokens)
    return {" ".join(tokens[i:i + k]) for i in range(len(tokens) - k + 1)}

def _jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Compute Jaccard similarity index between two shingle sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0

def _get_base_url_domain(url: str) -> str:
    """Extract clean domain/host from URL."""
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return ""

def cluster_evidence_sources(evidence_list: List[Dict[str, Any]], similarity_threshold: float = 0.40) -> Dict[str, Any]:
    """
    Cluster evidence records to identify syndicated, copied, or echo-chamber reports.
    Returns:
      - clusters: List of cluster objects with member record IDs and shared indicators.
      - clustered_evidence: Evidence records updated with cluster_id, is_independent_source, syndication_basis.
    """
    if not evidence_list:
        return {"clusters": [], "clustered_evidence": []}

    shingles_map = {}
    for ev in evidence_list:
        content = ev.get("normalized_content") or ev.get("original_content") or ""
        shingles_map[ev["id"]] = _tokenize_shingles(content, k=3)

    # Initialize each evidence as its own cluster candidate
    clusters: List[Dict[str, Any]] = []
    assigned_cluster_id: Dict[str, str] = {}
    syndication_reasons: Dict[str, str] = {}
    is_independent: Dict[str, int] = {}

    for i, ev_a in enumerate(evidence_list):
        id_a = ev_a["id"]
        if id_a in assigned_cluster_id:
            continue

        cluster_id = f"clust-{uuid.uuid4().hex[:8]}"
        assigned_cluster_id[id_a] = cluster_id
        is_independent[id_a] = 1  # Primary representative of this cluster
        syndication_reasons[id_a] = "Original primary reporting record in cluster"

        cluster_members = [id_a]
        shared_indicators = set()

        url_a = (ev_a.get("source_url") or "").strip()
        dom_a = _get_base_url_domain(url_a)

        for j in range(i + 1, len(evidence_list)):
            ev_b = evidence_list[j]
            id_b = ev_b["id"]
            if id_b in assigned_cluster_id:
                continue

            # 1. Text Shingle Overlap
            sim = _jaccard_similarity(shingles_map[id_a], shingles_map[id_b])

            # 2. Shared Source Advisory URL or Citation
            url_b = (ev_b.get("source_url") or "").strip()
            same_url = bool(url_a and url_b and url_a == url_b)

            # 3. Identical Source Name (repeated ingestion from same author)
            same_source_name = (
                (ev_a.get("source_name") or "").strip().lower() ==
                (ev_b.get("source_name") or "").strip().lower()
            )

            if sim >= similarity_threshold or same_url or (same_source_name and sim >= 0.25):
                assigned_cluster_id[id_b] = cluster_id
                cluster_members.append(id_b)
                is_independent[id_b] = 0  # Secondary/syndicated copy, cannot count as independent corroboration

                basis_reasons = []
                if same_url:
                    basis_reasons.append(f"Identical citation URL ({url_a[:40]}...)")
                if sim >= similarity_threshold:
                    basis_reasons.append(f"High text shingle Jaccard overlap ({sim:.2f})")
                if same_source_name:
                    basis_reasons.append(f"Same source publisher ({ev_a.get('source_name')})")

                syndication_reasons[id_b] = f"Syndicated reporting: {'; '.join(basis_reasons)}"
                shared_indicators.add(f"overlap_score_{round(sim, 2)}")
                if dom_a:
                    shared_indicators.add(dom_a)

        clusters.append({
            "id": cluster_id,
            "cluster_name": f"Source Cluster: {ev_a.get('source_name', 'Source')} Group",
            "representative_evidence_id": id_a,
            "member_count": len(cluster_members),
            "member_ids": cluster_members,
            "shared_indicators": list(shared_indicators)
        })

    # Update evidence items with clustering metadata
    clustered_evidence = []
    for ev in evidence_list:
        ev_copy = dict(ev)
        ev_id = ev_copy["id"]
        ev_copy["cluster_id"] = assigned_cluster_id.get(ev_id)
        ev_copy["is_independent_source"] = is_independent.get(ev_id, 1)
        ev_copy["syndication_basis"] = syndication_reasons.get(ev_id, "Unique independent source reporting")
        clustered_evidence.append(ev_copy)

    return {
        "clusters": clusters,
        "clustered_evidence": clustered_evidence
    }
