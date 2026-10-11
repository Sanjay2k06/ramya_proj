import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
from database import get_db
from utils.validators import calculate_sha256, sanitize_cti_text
from services.normalization import normalize_text
from services.entity_extractor import extract_entities_from_text
from services.claim_extractor import extract_claims_from_evidence
from services.temporal_analyzer import analyze_temporal_sequence
from services.correlation_engine import correlate_evidence_and_entities
from services.conflict_detector import detect_cti_conflicts
from services.graph_service import build_investigation_graph
from services.risk_scorer import calculate_explainable_risk
from services.recommendation_service import generate_defensive_recommendations
from services.gemini_service import GeminiService
from services.clustering_service import cluster_evidence_sources

def run_investigation_pipeline(investigation_id: str, use_gemini: bool = True) -> Dict[str, Any]:
    """Execute the full 12-stage temporal forensic CTI analysis pipeline."""
    started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    stages_completed = []
    run_id = f"run-{uuid.uuid4().hex[:10]}"
    used_gemini_actual = False

    with get_db() as conn:
        cursor = conn.cursor()

        # Update investigation status to running
        cursor.execute("UPDATE investigations SET status = 'running', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (investigation_id,))
        
        # Record analysis run
        cursor.execute("""
            INSERT INTO analysis_runs (id, investigation_id, run_type, status, stages_completed, used_gemini, logs, started_at)
            VALUES (?, ?, 'full_pipeline', 'running', '[]', 0, 'Pipeline initiated', CURRENT_TIMESTAMP)
        """, (run_id, investigation_id))

        # Retrieve evidence records for this investigation
        cursor.execute("SELECT * FROM evidence_records WHERE investigation_id = ?", (investigation_id,))
        evidence_rows = cursor.fetchall()
        evidence_list = [dict(r) for r in evidence_rows]

        if not evidence_list:
            cursor.execute("UPDATE investigations SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (investigation_id,))
            cursor.execute("UPDATE analysis_runs SET status = 'failed', completed_at = CURRENT_TIMESTAMP, logs = 'No evidence records found for investigation' WHERE id = ?", (run_id,))
            return {"success": False, "error": "No evidence records associated with this investigation"}

        stages_completed.append("1_input_validation")

        # Stage 2: Normalization
        for ev in evidence_list:
            norm_content = normalize_text(ev.get("original_content", ""))
            ev["normalized_content"] = norm_content
            cursor.execute("UPDATE evidence_records SET normalized_content = ? WHERE id = ?", (norm_content, ev["id"]))
        stages_completed.append("2_normalization")

        # Stage 2b: Source Clustering & Independence Verification (Prevents Syndication Echo Chambers)
        clustering_res = cluster_evidence_sources(evidence_list)
        cursor.execute("DELETE FROM source_clusters WHERE investigation_id = ?", (investigation_id,))
        for cl in clustering_res["clusters"]:
            cursor.execute("""
                INSERT INTO source_clusters (id, investigation_id, cluster_name, representative_evidence_id, member_count, shared_indicators_json)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cl["id"], investigation_id, cl["cluster_name"], cl["representative_evidence_id"], cl["member_count"], json.dumps(cl["shared_indicators"])))

        evidence_list = clustering_res["clustered_evidence"]
        for ev in evidence_list:
            cursor.execute("""
                UPDATE evidence_records
                SET cluster_id = ?, is_independent_source = ?, syndication_basis = ?
                WHERE id = ?
            """, (ev.get("cluster_id"), ev.get("is_independent_source", 1), ev.get("syndication_basis"), ev["id"]))
        stages_completed.append("2b_source_clustering")

        # Clean prior extracted artifacts if rerunning
        cursor.execute("DELETE FROM claim_entities WHERE claim_id IN (SELECT id FROM claims WHERE investigation_id = ?)", (investigation_id,))
        cursor.execute("DELETE FROM claims WHERE investigation_id = ?", (investigation_id,))
        cursor.execute("DELETE FROM evidence_relationships WHERE investigation_id = ?", (investigation_id,))
        cursor.execute("DELETE FROM conflicts WHERE investigation_id = ?", (investigation_id,))
        cursor.execute("DELETE FROM risk_score_components WHERE risk_assessment_id IN (SELECT id FROM risk_assessments WHERE investigation_id = ?)", (investigation_id,))
        cursor.execute("DELETE FROM risk_assessments WHERE investigation_id = ?", (investigation_id,))
        cursor.execute("DELETE FROM recommendations WHERE investigation_id = ?", (investigation_id,))
        cursor.execute("DELETE FROM entities WHERE investigation_id = ?", (investigation_id,))

        # Stage 3: Entity Extraction
        all_entities: List[Dict[str, Any]] = []
        for ev in evidence_list:
            extracted = extract_entities_from_text(ev["normalized_content"], investigation_id)
            for ent in extracted:
                if not any(e["normalized_value"] == ent["normalized_value"] and e["entity_type"] == ent["entity_type"] for e in all_entities):
                    all_entities.append(ent)
                    cursor.execute("""
                        INSERT INTO entities (id, investigation_id, entity_type, value, normalized_value, first_seen, last_seen, confidence, context)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        ent["id"], investigation_id, ent["entity_type"], ent["value"], ent["normalized_value"],
                        ev.get("source_timestamp"), ev.get("source_timestamp"), ent["confidence"], ent["context"]
                    ))
        stages_completed.append("3_entity_extraction")

        # Optional Gemini assistance for deep semantic extraction
        if use_gemini:
            gemini = GeminiService()
            if gemini.is_configured():
                combined_text = "\n\n".join(e["normalized_content"] for e in evidence_list[:4])
                ai_result = gemini.analyze_threat_claims(combined_text)
                if ai_result.get("success") and ai_result.get("data"):
                    used_gemini_actual = True
                    # Add any novel entities discovered by Gemini
                    for ent in ai_result["data"].get("extracted_entities", []):
                        val = ent.get("value", "").strip()
                        etype = ent.get("type", "generic").lower()
                        if val and not any(e["value"].lower() == val.lower() for e in all_entities):
                            new_ent = {
                                "id": f"ent-{uuid.uuid4().hex[:10]}",
                                "investigation_id": investigation_id,
                                "entity_type": etype,
                                "value": val,
                                "normalized_value": val.lower(),
                                "first_seen": None,
                                "last_seen": None,
                                "confidence": float(ent.get("confidence", 0.85)),
                                "context": "Extracted via Gemini AI semantic parsing"
                            }
                            all_entities.append(new_ent)
                            cursor.execute("""
                                INSERT INTO entities (id, investigation_id, entity_type, value, normalized_value, first_seen, last_seen, confidence, context)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                new_ent["id"], investigation_id, new_ent["entity_type"], new_ent["value"],
                                new_ent["normalized_value"], None, None, new_ent["confidence"], new_ent["context"]
                            ))

        # Stage 4: Claim Extraction
        all_claims: List[Dict[str, Any]] = []
        for ev in evidence_list:
            claims = extract_claims_from_evidence(
                ev["id"], investigation_id, ev["normalized_content"],
                ev.get("source_timestamp"), ev["collection_timestamp"], all_entities,
                ev.get("provenance_metadata")
            )
            for c in claims:
                all_claims.append(c)
                cursor.execute("""
                    INSERT INTO claims (id, investigation_id, evidence_id, claim_text, subject, predicate, object, event_time, publication_time, collection_time, extraction_method, confidence, supporting_excerpt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c["id"], investigation_id, c["evidence_id"], c["claim_text"], c["subject"], c["predicate"],
                    c["object"], c["event_time"], c["publication_time"], c["collection_time"],
                    "hybrid" if used_gemini_actual else "deterministic", c["confidence"], c["supporting_excerpt"]
                ))
        stages_completed.append("4_claim_extraction")

        # Stage 5 & 6: Temporal Analysis & Correlation
        temporal_res = analyze_temporal_sequence(all_claims, evidence_list)
        stages_completed.append("5_temporal_analysis")

        correlation_res = correlate_evidence_and_entities(all_entities, all_claims, evidence_list)
        relationships = correlation_res["relationships"]

        for rel in relationships:
            rel_id = f"rel-{uuid.uuid4().hex[:10]}"
            cursor.execute("""
                INSERT INTO evidence_relationships (id, investigation_id, source_entity_id, target_entity_id, relationship_type, weight, evidence_id, description, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rel_id, investigation_id, rel["source_entity_id"], rel["target_entity_id"],
                rel["relationship_type"], rel["weight"], rel.get("evidence_id"), rel.get("description"), rel.get("timestamp")
            ))
        stages_completed.append("6_correlation")

        # Stage 7: Conflict Detection
        conflicts = detect_cti_conflicts(all_claims, evidence_list)
        for conf in conflicts:
            cursor.execute("""
                INSERT INTO conflicts (id, investigation_id, claim_a_id, claim_b_id, conflict_type, reason, supporting_evidence, confidence, review_status, recommended_verification)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """, (
                conf["id"], investigation_id, conf["claim_a_id"], conf["claim_b_id"],
                conf["conflict_type"], conf["reason"], conf["supporting_evidence"], conf["confidence"], conf["recommended_verification"]
            ))
        stages_completed.append("7_conflict_detection")

        # Stage 8: Graph Construction
        graph_data = build_investigation_graph(evidence_list, all_entities, all_claims, relationships, conflicts)
        stages_completed.append("8_graph_construction")

        # Stage 9: Risk Prioritization (Evidence-gap aware & decoupled confidence)
        risk_res = calculate_explainable_risk(evidence_list, all_entities, all_claims, conflicts)
        risk_id = f"risk-{uuid.uuid4().hex[:10]}"
        cursor.execute("""
            INSERT INTO risk_assessments (
                id, investigation_id, overall_priority_score, priority_category, 
                summary, factors_json, missing_factors_json, uncertainty_notes,
                evidence_confidence, evidence_completeness, conflict_status,
                uncertainty_flags_json, scoring_config_version
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            risk_id, investigation_id, risk_res["overall_priority_score"], risk_res["priority_category"],
            risk_res["summary"], json.dumps(risk_res["components"]), json.dumps(risk_res["missing_factors"]),
            risk_res["uncertainty_notes"], risk_res["evidence_confidence"], risk_res["evidence_completeness"],
            risk_res["conflict_status"], json.dumps(risk_res["uncertainty_flags"]), risk_res["scoring_config_version"]
        ))

        for comp in risk_res["components"]:
            comp_id = f"comp-{uuid.uuid4().hex[:10]}"
            cursor.execute("""
                INSERT INTO risk_score_components (id, risk_assessment_id, factor_name, raw_value, weight, weighted_contribution, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                comp_id, risk_id, comp["factor_name"], comp["raw_value"], comp["weight"], comp["weighted_contribution"], comp["explanation"]
            ))
        stages_completed.append("9_risk_prioritization")

        # Stage 10: Defensive Recommendations
        recommendations = generate_defensive_recommendations(investigation_id, evidence_list, all_entities, conflicts, risk_res)
        for rec in recommendations:
            cursor.execute("""
                INSERT INTO recommendations (id, investigation_id, priority, title, reason, related_finding, supporting_evidence_ids, verification_steps, expected_benefit, confidence, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rec["id"], investigation_id, rec["priority"], rec["title"], rec["reason"], rec["related_finding"],
                rec["supporting_evidence_ids"], rec["verification_steps"], rec["expected_benefit"], rec["confidence"], rec["status"]
            ))
        stages_completed.append("10_defensive_recommendations")

        # Stage 11: Persistence & Verification
        stages_completed.append("11_persistence")

        # Build full run snapshot summary for historical comparison
        snapshot_summary = {
            "run_id": run_id,
            "investigation_id": investigation_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "evidence_count": len(evidence_list),
            "evidence_ids": [e["id"] for e in evidence_list],
            "independent_sources_count": sum(1 for e in evidence_list if e.get("is_independent_source", 1) == 1),
            "clusters_count": len(clustering_res.get("clusters", [])),
            "entity_count": len(all_entities),
            "entities_sample": [e["value"] for e in all_entities[:10]],
            "claim_count": len(all_claims),
            "corroborated_claims_count": sum(1 for c in all_claims if c.get("is_corroborated", 0) == 1),
            "conflict_count": len(conflicts),
            "conflict_types": [c["conflict_type"] for c in conflicts],
            "priority_score": risk_res["overall_priority_score"],
            "priority_category": risk_res["priority_category"],
            "evidence_confidence": risk_res["evidence_confidence"],
            "evidence_completeness": risk_res["evidence_completeness"],
            "conflict_status": risk_res["conflict_status"],
            "uncertainty_flags": risk_res["uncertainty_flags"],
            "recommendation_count": len(recommendations)
        }

        # Update Investigation Status to Completed
        cursor.execute("""
            UPDATE investigations 
            SET status = 'completed', use_gemini = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (1 if used_gemini_actual else 0, investigation_id))

        # Complete Analysis Run Record with Snapshot
        cursor.execute("""
            UPDATE analysis_runs 
            SET status = 'completed', stages_completed = ?, used_gemini = ?, logs = ?, snapshot_json = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (
            json.dumps(stages_completed), 1 if used_gemini_actual else 0, 
            f"Analysis finished successfully with {len(stages_completed)} stages.", 
            json.dumps(snapshot_summary), run_id
        ))

    return {
        "success": True,
        "investigation_id": investigation_id,
        "used_gemini": used_gemini_actual,
        "stages_completed": stages_completed,
        "evidence_count": len(evidence_list),
        "entity_count": len(all_entities),
        "claim_count": len(all_claims),
        "conflict_count": len(conflicts),
        "priority_score": risk_res["overall_priority_score"],
        "priority_category": risk_res["priority_category"],
        "recommendation_count": len(recommendations)
    }
