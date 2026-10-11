import json
from flask import Blueprint, request, jsonify, g
from database import get_db
from security.auth_helpers import jwt_required
from services.temporal_analyzer import analyze_temporal_sequence
from services.graph_service import build_investigation_graph
from services.reasoning_service import generate_explainable_reasoning
from services.time_to_exploit import predict_time_to_exploit

analysis_bp = Blueprint("analysis", __name__, url_prefix="/api/v1/investigations")

@analysis_bp.route("/<inv_id>/timeline", methods=["GET"])
@jwt_required
def get_timeline(inv_id: str):
    """Retrieve chronologically ordered events, timestamps, and temporal anomalies."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evidence_records WHERE investigation_id = ?", (inv_id,))
        evidence_list = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM claims WHERE investigation_id = ?", (inv_id,))
        claims = [dict(r) for r in cursor.fetchall()]

    result = analyze_temporal_sequence(claims, evidence_list)
    return jsonify(result), 200

@analysis_bp.route("/<inv_id>/graph", methods=["GET"])
@jwt_required
def get_knowledge_graph(inv_id: str):
    """Retrieve React Flow compatible knowledge graph nodes, edges, and centrality metrics."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evidence_records WHERE investigation_id = ?", (inv_id,))
        evidence_list = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM entities WHERE investigation_id = ?", (inv_id,))
        entities = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM claims WHERE investigation_id = ?", (inv_id,))
        claims = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM evidence_relationships WHERE investigation_id = ?", (inv_id,))
        relationships = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM conflicts WHERE investigation_id = ?", (inv_id,))
        conflicts = [dict(r) for r in cursor.fetchall()]

    graph_data = build_investigation_graph(evidence_list, entities, claims, relationships, conflicts)
    return jsonify(graph_data), 200

@analysis_bp.route("/<inv_id>/conflicts", methods=["GET"])
@jwt_required
def get_conflicts(inv_id: str):
    """Retrieve identified intelligence contradictions, attribution clashes, and version disputes."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.*, 
                   ca.claim_text as claim_a_text, ca.subject as subject_a, ca.event_time as event_time_a,
                   cb.claim_text as claim_b_text, cb.subject as subject_b, cb.event_time as event_time_b,
                   ea.source_name as source_a, eb.source_name as source_b
            FROM conflicts c
            LEFT JOIN claims ca ON ca.id = c.claim_a_id
            LEFT JOIN claims cb ON cb.id = c.claim_b_id
            LEFT JOIN evidence_records ea ON ea.id = ca.evidence_id
            LEFT JOIN evidence_records eb ON eb.id = cb.evidence_id
            WHERE c.investigation_id = ?
            ORDER BY c.confidence DESC
        """, (inv_id,))
        conflicts = [dict(r) for r in cursor.fetchall()]

    return jsonify({"conflicts": conflicts, "count": len(conflicts)}), 200

@analysis_bp.route("/conflicts/<conflict_id>", methods=["PATCH"])
@jwt_required
def update_conflict_status(conflict_id: str):
    """Update analyst review status on a conflict (pending, verified, dismissed)."""
    data = request.get_json() or {}
    review_status = data.get("review_status")
    analyst_notes = data.get("analyst_notes")

    if review_status not in ("pending", "verified", "dismissed"):
        return jsonify({"error": "Invalid review status"}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE conflicts 
            SET review_status = ?, analyst_notes = COALESCE(?, analyst_notes)
            WHERE id = ?
        """, (review_status, analyst_notes, conflict_id))

    return jsonify({"message": "Conflict review status updated"}), 200

@analysis_bp.route("/<inv_id>/risk", methods=["GET"])
@jwt_required
def get_risk_assessment(inv_id: str):
    """Retrieve explainable risk score, factor decomposition, and missing information."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM risk_assessments WHERE investigation_id = ?", (inv_id,))
        risk = cursor.fetchone()
        if not risk:
            return jsonify({"error": "No risk assessment computed yet"}), 404
        
        risk_data = dict(risk)
        cursor.execute("SELECT * FROM risk_score_components WHERE risk_assessment_id = ?", (risk_data["id"],))
        risk_data["components"] = [dict(r) for r in cursor.fetchall()]
        risk_data["missing_factors"] = json.loads(risk_data.get("missing_factors_json") or "[]")
        risk_data["uncertainty_flags"] = json.loads(risk_data.get("uncertainty_flags_json") or "[]")

    return jsonify(risk_data), 200

@analysis_bp.route("/<inv_id>/findings/reviews", methods=["GET"])
@jwt_required
def get_finding_reviews(inv_id: str):
    """Retrieve all Human-in-the-Loop finding reviews and audit justifications."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM finding_reviews 
            WHERE investigation_id = ?
            ORDER BY created_at DESC
        """, (inv_id,))
        reviews = [dict(r) for r in cursor.fetchall()]

    return jsonify({"reviews": reviews, "count": len(reviews)}), 200

@analysis_bp.route("/<inv_id>/findings/<finding_id>/review", methods=["POST"])
@jwt_required
def submit_finding_review(inv_id: str, finding_id: str):
    """Submit an analyst Human-in-the-Loop review for a finding or claim."""
    data = request.get_json() or {}
    review_status = (data.get("review_status") or "").upper().strip()
    justification = (data.get("justification") or "").strip()
    finding_topic = (data.get("finding_topic") or "").strip()

    valid_statuses = ("SUPPORTED", "CONTRADICTED", "INCONCLUSIVE", "NEEDS_VERIFICATION")
    if review_status not in valid_statuses:
        return jsonify({"error": f"Invalid review status. Must be one of: {', '.join(valid_statuses)}"}), 400

    if not justification:
        return jsonify({"error": "Analyst justification is mandatory for audit defensibility."}), 400

    review_id = f"rev-{import_uuid.uuid4().hex[:10]}" if 'import_uuid' in locals() else f"rev-{str(g.current_user['id'])[:6]}-{str(finding_id)[:8]}"

    with get_db() as conn:
        cursor = conn.cursor()
        # Find previous status if reviewed before
        cursor.execute("""
            SELECT review_status FROM finding_reviews 
            WHERE investigation_id = ? AND finding_id = ? 
            ORDER BY created_at DESC LIMIT 1
        """, (inv_id, finding_id))
        prev = cursor.fetchone()
        prev_status = prev["review_status"] if prev else "UNREVIEWED"

        import uuid
        rev_uuid = f"rev-{uuid.uuid4().hex[:10]}"
        cursor.execute("""
            INSERT INTO finding_reviews (id, investigation_id, finding_id, finding_topic, review_status, reviewer_username, justification, previous_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (rev_uuid, inv_id, finding_id, finding_topic, review_status, g.current_user["username"], justification, prev_status))

        # Also write to audit_events
        cursor.execute("""
            INSERT INTO audit_events (id, user_id, investigation_id, event_type, details)
            VALUES (?, ?, ?, 'FINDING_HUMAN_REVIEW', ?)
        """, (
            f"aud-{uuid.uuid4().hex[:10]}", g.current_user["id"], inv_id,
            f"Finding {finding_id} reviewed as {review_status} by {g.current_user['username']}: {justification[:100]}"
        ))

    return jsonify({
        "message": "Analyst finding review successfully recorded",
        "review_id": rev_uuid,
        "review_status": review_status,
        "previous_status": prev_status,
        "reviewer": g.current_user["username"]
    }), 201

@analysis_bp.route("/<inv_id>/recommendations", methods=["GET"])
@jwt_required
def get_recommendations(inv_id: str):
    """Retrieve prioritized defensive recommendations."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recommendations WHERE investigation_id = ? ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END", (inv_id,))
        recs = [dict(r) for r in cursor.fetchall()]

    return jsonify({"recommendations": recs, "count": len(recs)}), 200

@analysis_bp.route("/recommendations/<rec_id>", methods=["PATCH"])
@jwt_required
def update_recommendation_status(rec_id: str):
    """Update defensive recommendation status (pending, accepted, completed, dismissed)."""
    data = request.get_json() or {}
    status = data.get("status")

    if status not in ("pending", "accepted", "completed", "dismissed"):
        return jsonify({"error": "Invalid recommendation status"}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE recommendations SET status = ? WHERE id = ?", (status, rec_id))

    return jsonify({"message": "Recommendation updated successfully", "status": status}), 200

@analysis_bp.route("/<inv_id>/reasoning", methods=["GET"])
@jwt_required
def get_reasoning(inv_id: str):
    """Retrieve structured 8-point explainable reasoning blocks."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evidence_records WHERE investigation_id = ?", (inv_id,))
        evidence_list = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM entities WHERE investigation_id = ?", (inv_id,))
        entities = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM claims WHERE investigation_id = ?", (inv_id,))
        claims = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
            SELECT c.*, ca.claim_text as claim_a_text, cb.claim_text as claim_b_text
            FROM conflicts c
            LEFT JOIN claims ca ON ca.id = c.claim_a_id
            LEFT JOIN claims cb ON cb.id = c.claim_b_id
            WHERE c.investigation_id = ?
        """, (inv_id,))
        conflicts = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM risk_assessments WHERE investigation_id = ?", (inv_id,))
        risk = cursor.fetchone()
        risk_data = dict(risk) if risk else {}

    reasoning_blocks = generate_explainable_reasoning(evidence_list, entities, claims, conflicts, risk_data)
    return jsonify({"reasoning": reasoning_blocks}), 200

@analysis_bp.route("/<inv_id>/time-to-exploit", methods=["GET"])
@jwt_required
def get_time_to_exploit(inv_id: str):
    """Retrieve experimental Time-to-Exploit prediction for identified CVEs."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM entities WHERE investigation_id = ? AND entity_type = 'cve'", (inv_id,))
        cves = cursor.fetchall()
        
        cursor.execute("SELECT normalized_content FROM evidence_records WHERE investigation_id = ?", (inv_id,))
        ev_texts = " ".join(r["normalized_content"] for r in cursor.fetchall())

    if not cves:
        return jsonify({
            "model_status": "model_not_trained",
            "message": "No CVE indicators detected in this investigation to perform Time-to-Exploit regression.",
            "is_experimental": True,
            "predictions": []
        }), 200

    predictions = []
    for cve in cves:
        cve_val = cve["value"]
        pred = predict_time_to_exploit(cve_val, ev_texts)
        predictions.append(pred)

    return jsonify({
        "model_status": "baseline_stacking_regressor",
        "predictions": predictions,
        "is_experimental": True
    }), 200
