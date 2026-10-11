import networkx as nx
import math
from typing import List, Dict, Any

def build_investigation_graph(
    evidence_list: List[Dict[str, Any]],
    entities: List[Dict[str, Any]],
    claims: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Construct a NetworkX multi-directed graph and serialize for React Flow."""
    G = nx.MultiDiGraph()

    # 1. Add Entity Nodes
    for ent in entities:
        G.add_node(
            ent["id"],
            node_type="entity",
            entity_type=ent["entity_type"],
            label=ent["value"],
            value=ent["value"],
            confidence=ent.get("confidence", 0.8),
            context=ent.get("context", "")
        )

    # 2. Add Evidence Record Nodes
    for ev in evidence_list:
        G.add_node(
            ev["id"],
            node_type="evidence",
            entity_type="evidence_record",
            label=ev["source_name"],
            source_type=ev.get("source_type", "advisory"),
            source_timestamp=ev.get("source_timestamp"),
            confidence=ev.get("confidence_score", 0.7),
            classification=ev.get("classification", "unverified")
        )

    # 3. Add Edges between Evidence and Entities (MENTIONS)
    for ent in entities:
        for ev in evidence_list:
            if ent["value"].lower() in (ev.get("normalized_content") or ev.get("original_content", "")).lower():
                G.add_edge(
                    ev["id"],
                    ent["id"],
                    key=f"mentions-{ev['id']}-{ent['id']}",
                    label="MENTIONS",
                    relationship_type="MENTIONS",
                    evidence_id=ev["id"],
                    is_conflict=False
                )

    # 4. Add Cross-Entity Relationships
    for rel in relationships:
        if G.has_node(rel["source_entity_id"]) and G.has_node(rel["target_entity_id"]):
            G.add_edge(
                rel["source_entity_id"],
                rel["target_entity_id"],
                key=f"rel-{rel['source_entity_id']}-{rel['target_entity_id']}-{rel['relationship_type']}",
                label=rel["relationship_type"],
                relationship_type=rel["relationship_type"],
                evidence_id=rel.get("evidence_id"),
                description=rel.get("description", ""),
                timestamp=rel.get("timestamp"),
                is_conflict=False
            )

    # 5. Add Conflict Edges (CONTRADICTS)
    for conf in conflicts:
        claim_a = next((c for c in claims if c["id"] == conf.get("claim_a_id")), None)
        claim_b = next((c for c in claims if c["id"] == conf.get("claim_b_id")), None)
        if claim_a and claim_b:
            subj_a = next((e["id"] for e in entities if e["value"].lower() == (claim_a.get("subject") or "").lower()), None)
            subj_b = next((e["id"] for e in entities if e["value"].lower() == (claim_b.get("subject") or "").lower()), None)
            if subj_a and subj_b and subj_a != subj_b and G.has_node(subj_a) and G.has_node(subj_b):
                G.add_edge(
                    subj_a,
                    subj_b,
                    key=f"conflict-{conf['id']}",
                    label="CONTRADICTS",
                    relationship_type="CONTRADICTS",
                    conflict_id=conf["id"],
                    reason=conf["reason"],
                    is_conflict=True
                )

    # Calculate normalized layout positions for React Flow rendering
    nodes_count = len(G.nodes)
    if nodes_count > 0:
        try:
            k_val = max(0.2, 1.2 / math.sqrt(nodes_count))
            pos = nx.spring_layout(G, k=k_val, iterations=60, seed=42)
        except Exception:
            pos = {
                node_id: ((i % 5) * 170 + 80, (i // 5) * 110 + 60)
                for i, node_id in enumerate(G.nodes)
            }
    else:
        pos = {}

    react_flow_nodes = []
    if pos:
        min_x = min(p[0] for p in pos.values())
        max_x = max(p[0] for p in pos.values())
        min_y = min(p[1] for p in pos.values())
        max_y = max(p[1] for p in pos.values())
        range_x = (max_x - min_x) if max_x > min_x else 1.0
        range_y = (max_y - min_y) if max_y > min_y else 1.0

        for node_id, data in G.nodes(data=True):
            p = pos.get(node_id, (0, 0))
            # Normalized strictly to 80px - 820px X and 60px - 560px Y
            norm_x = (p[0] - min_x) / range_x
            norm_y = (p[1] - min_y) / range_y
            x = float(80.0 + norm_x * 740.0)
            y = float(60.0 + norm_y * 480.0)

            react_flow_nodes.append({
                "id": str(node_id),
                "type": "forensicNode",
                "position": {"x": round(x, 1), "y": round(y, 1)},
                "data": {
                    "id": str(node_id),
                    "label": data.get("label", str(node_id)),
                    "node_type": data.get("node_type", "entity"),
                    "entity_type": data.get("entity_type", "generic"),
                    "confidence": data.get("confidence", 0.8),
                    "source_type": data.get("source_type"),
                    "source_timestamp": data.get("source_timestamp"),
                    "context": data.get("context", "")
                }
            })

    react_flow_edges = []
    edge_idx = 0
    for u, v, key, data in G.edges(keys=True, data=True):
        edge_idx += 1
        is_conflict = data.get("is_conflict", False)
        react_flow_edges.append({
            "id": f"e-{u}-{v}-{edge_idx}",
            "source": str(u),
            "target": str(v),
            "label": data.get("label", ""),
            "animated": is_conflict,
            "data": {
                "relationship_type": data.get("relationship_type", "RELATED_TO"),
                "evidence_id": data.get("evidence_id"),
                "description": data.get("description", ""),
                "is_conflict": is_conflict,
                "conflict_id": data.get("conflict_id")
            },
            "style": {
                "stroke": "#DC2626" if is_conflict else "#94A3B8",
                "strokeWidth": 2.5 if is_conflict else 1.5,
                "strokeDasharray": "5 5" if is_conflict else None
            }
        })

    # Summary metrics
    degree_centrality = nx.degree_centrality(G) if nodes_count > 0 else {}
    top_central_nodes = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "nodes": react_flow_nodes,
        "edges": react_flow_edges,
        "graph_metrics": {
            "node_count": nodes_count,
            "edge_count": len(react_flow_edges),
            "density": round(nx.density(G), 3) if nodes_count > 0 else 0,
            "top_entities": [
                {"id": nid, "label": G.nodes[nid].get("label"), "centrality": round(cent, 3)}
                for nid, cent in top_central_nodes if nid in G.nodes
            ]
        }
    }
