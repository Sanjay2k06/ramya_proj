import uuid
import json
import datetime
from pathlib import Path
from flask import Blueprint, request, jsonify, g
from database import get_db
from config import Config
from security.auth_helpers import jwt_required
from services.pipeline import run_investigation_pipeline
from utils.validators import calculate_sha256, sanitize_cti_text

investigations_bp = Blueprint("investigations", __name__, url_prefix="/api/v1/investigations")

@investigations_bp.route("", methods=["GET"])
@jwt_required
def list_investigations():
    """List investigations belonging to the authenticated analyst."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.id, i.title, i.description, i.objective, i.status, i.use_gemini, i.dataset_source,
                   i.created_at, i.updated_at,
                   COUNT(DISTINCT e.id) as evidence_count,
                   COUNT(DISTINCT ent.id) as entity_count,
                   COUNT(DISTINCT c.id) as conflict_count,
                   COALESCE(r.overall_priority_score, 0) as priority_score,
                   COALESCE(r.priority_category, 'PENDING') as priority_category
            FROM investigations i
            LEFT JOIN evidence_records e ON e.investigation_id = i.id
            LEFT JOIN entities ent ON ent.investigation_id = i.id
            LEFT JOIN conflicts c ON c.investigation_id = i.id
            LEFT JOIN risk_assessments r ON r.investigation_id = i.id
            WHERE i.user_id = ?
            GROUP BY i.id
            ORDER BY i.created_at DESC
        """, (g.current_user["id"],))
        rows = [dict(r) for r in cursor.fetchall()]

    return jsonify({"investigations": rows, "count": len(rows)}), 200

@investigations_bp.route("", methods=["POST"])
@jwt_required
def create_investigation():
    """Create a new investigation and ingest untrusted CTI text or synthetic dataset records."""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    objective = data.get("objective", "defensive_prioritization")
    use_gemini = int(bool(data.get("use_gemini", True)))
    dataset_source = data.get("dataset_source", "manual")  # manual, synthetic_benchmark, uploaded_file
    pasted_cti = data.get("pasted_cti", "")
    records_to_ingest = data.get("records", [])

    if not title:
        return jsonify({"error": "Investigation title is required"}), 400

    inv_id = f"inv-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO investigations (id, user_id, title, description, objective, status, use_gemini, dataset_source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        """, (inv_id, g.current_user["id"], title, description, objective, use_gemini, dataset_source, now_iso, now_iso))

        evidence_count = 0

        # Scenario 1: User requested importing synthetic benchmark dataset
        if dataset_source == "synthetic_benchmark":
            synth_file = Config.SYNTHETIC_DATASET_PATH
            if synth_file.exists():
                with open(synth_file, "r", encoding="utf-8") as f:
                    synth_data = json.load(f)
                    for rec in synth_data.get("records", []):
                        ev_id = f"ev-{uuid.uuid4().hex[:10]}"
                        c_hash = calculate_sha256(rec["original_content"])
                        cursor.execute("""
                            INSERT INTO evidence_records (id, investigation_id, source_name, source_url, source_type, original_content, normalized_content, source_timestamp, collection_timestamp, threat_category, classification, confidence_score, provenance_metadata, content_hash)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            ev_id, inv_id, rec["source_name"], rec.get("source_url"), rec.get("source_type", "threat_advisory"),
                            rec["original_content"], rec["original_content"], rec.get("source_timestamp"),
                            rec.get("collection_timestamp", now_iso), rec.get("threat_category", "general_intel"),
                            "unverified", rec.get("confidence_score", 0.7), json.dumps({"imported_from": "synthetic_dataset", "benchmark_claims": rec.get("claims", [])}), c_hash
                        ))
                        evidence_count += 1

        # Scenario 2: User pasted raw CTI text
        elif pasted_cti.strip():
            sanitized = sanitize_cti_text(pasted_cti)
            ev_id = f"ev-{uuid.uuid4().hex[:10]}"
            c_hash = calculate_sha256(sanitized)
            cursor.execute("""
                INSERT INTO evidence_records (id, investigation_id, source_name, source_url, source_type, original_content, normalized_content, source_timestamp, collection_timestamp, threat_category, classification, confidence_score, provenance_metadata, content_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ev_id, inv_id, "Analyst Ingest Stream", "", "raw_input",
                sanitized, sanitized, now_iso, now_iso, "unclassified",
                "unverified", 0.65, json.dumps({"source": "manual_paste"}), c_hash
            ))
            evidence_count += 1

        # Scenario 3: User uploaded or provided structured records
        elif records_to_ingest:
            for rec in records_to_ingest:
                content = sanitize_cti_text(rec.get("content", ""))
                if not content:
                    continue
                ev_id = f"ev-{uuid.uuid4().hex[:10]}"
                c_hash = calculate_sha256(content)
                cursor.execute("""
                    INSERT INTO evidence_records (id, investigation_id, source_name, source_url, source_type, original_content, normalized_content, source_timestamp, collection_timestamp, threat_category, classification, confidence_score, provenance_metadata, content_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ev_id, inv_id, rec.get("source_name", "Uploaded CTI"), rec.get("source_url", ""),
                    rec.get("source_type", "uploaded_file"), content, content,
                    rec.get("source_timestamp", now_iso), now_iso, rec.get("threat_category", "general_intel"),
                    "unverified", float(rec.get("confidence", 0.7)), json.dumps({"imported_from": "user_upload"}), c_hash
                ))
                evidence_count += 1

        # Auto-trigger pipeline if records exist
        if data.get("auto_analyze", True) and evidence_count > 0:
            pass  # We will run pipeline right after committing

    # Run analysis pipeline if requested
    if data.get("auto_analyze", True) and evidence_count > 0:
        pipeline_result = run_investigation_pipeline(inv_id, use_gemini=bool(use_gemini))
    else:
        pipeline_result = None

    return jsonify({
        "message": "Investigation created successfully",
        "investigation_id": inv_id,
        "evidence_ingested": evidence_count,
        "pipeline_result": pipeline_result
    }), 201

@investigations_bp.route("/<inv_id>", methods=["GET"])
@jwt_required
def get_investigation_overview(inv_id: str):
    """Retrieve full overview and metadata for a specific investigation."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        inv = cursor.fetchone()
        if not inv:
            return jsonify({"error": "Investigation not found"}), 404

        inv_data = dict(inv)

        # Evidence count
        cursor.execute("SELECT COUNT(*) as cnt FROM evidence_records WHERE investigation_id = ?", (inv_id,))
        evidence_count = cursor.fetchone()["cnt"]

        # Entity count
        cursor.execute("SELECT COUNT(*) as cnt FROM entities WHERE investigation_id = ?", (inv_id,))
        entity_count = cursor.fetchone()["cnt"]

        # Claim count
        cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE investigation_id = ?", (inv_id,))
        claim_count = cursor.fetchone()["cnt"]

        # Conflict count
        cursor.execute("SELECT COUNT(*) as cnt FROM conflicts WHERE investigation_id = ?", (inv_id,))
        conflict_count = cursor.fetchone()["cnt"]

        # Risk assessment
        cursor.execute("SELECT * FROM risk_assessments WHERE investigation_id = ?", (inv_id,))
        risk = cursor.fetchone()
        risk_data = dict(risk) if risk else None

        # Recommendations count
        cursor.execute("SELECT COUNT(*) as cnt FROM recommendations WHERE investigation_id = ?", (inv_id,))
        rec_count = cursor.fetchone()["cnt"]

        # Latest analysis run
        cursor.execute("SELECT * FROM analysis_runs WHERE investigation_id = ? ORDER BY started_at DESC LIMIT 1", (inv_id,))
        last_run = cursor.fetchone()

    return jsonify({
        "investigation": inv_data,
        "summary": {
            "evidence_count": evidence_count,
            "entity_count": entity_count,
            "claim_count": claim_count,
            "conflict_count": conflict_count,
            "recommendation_count": rec_count,
            "risk_assessment": risk_data,
            "last_run": dict(last_run) if last_run else None
        }
    }), 200

@investigations_bp.route("/<inv_id>/analyze", methods=["POST"])
@investigations_bp.route("/<inv_id>/pipeline", methods=["POST"])
@jwt_required
def trigger_analysis(inv_id: str):
    """Trigger or rerun the 12-stage forensic pipeline for an investigation."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        inv = cursor.fetchone()
        if not inv:
            return jsonify({"error": "Investigation not found"}), 404

    data = request.get_json() or {}
    use_gemini = data.get("use_gemini", bool(inv["use_gemini"]))

    result = run_investigation_pipeline(inv_id, use_gemini=use_gemini)
    return jsonify({"message": "Pipeline execution completed", "result": result}), 200

@investigations_bp.route("/<inv_id>/status", methods=["GET"])
@jwt_required
def get_investigation_status(inv_id: str):
    """Retrieve live processing status and pipeline stages completed."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, updated_at FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        inv = cursor.fetchone()
        if not inv:
            return jsonify({"error": "Investigation not found"}), 404

        cursor.execute("SELECT * FROM analysis_runs WHERE investigation_id = ? ORDER BY started_at DESC LIMIT 1", (inv_id,))
        run_row = cursor.fetchone()

    return jsonify({
        "status": inv["status"],
        "updated_at": inv["updated_at"],
        "analysis_run": dict(run_row) if run_row else None
    }), 200

@investigations_bp.route("/<inv_id>", methods=["PATCH"])
@jwt_required
def update_investigation(inv_id: str):
    """Update title, description, or objective."""
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    objective = data.get("objective")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        updates = []
        params = []
        if title is not None:
            updates.append("title = ?")
            params.append(title.strip())
        if description is not None:
            updates.append("description = ?")
            params.append(description.strip())
        if objective is not None:
            updates.append("objective = ?")
            params.append(objective.strip())

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(inv_id)
            cursor.execute(f"UPDATE investigations SET {', '.join(updates)} WHERE id = ?", params)

    return jsonify({"message": "Investigation updated successfully"}), 200

@investigations_bp.route("/<inv_id>", methods=["DELETE"])
@jwt_required
def delete_investigation(inv_id: str):
    """Delete an investigation and all associated cascaded evidence records."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        cursor.execute("DELETE FROM investigations WHERE id = ?", (inv_id,))

    return jsonify({"message": "Investigation deleted successfully"}), 200

@investigations_bp.route("/<inv_id>/clusters", methods=["GET"])
@jwt_required
def get_source_clusters(inv_id: str):
    """Retrieve identified source syndication clusters and member independence ratings."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        cursor.execute("""
            SELECT sc.*, er.source_name as representative_source_name
            FROM source_clusters sc
            LEFT JOIN evidence_records er ON er.id = sc.representative_evidence_id
            WHERE sc.investigation_id = ?
            ORDER BY sc.member_count DESC
        """, (inv_id,))
        clusters = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
            SELECT id, source_name, source_url, source_type, cluster_id, is_independent_source, syndication_basis
            FROM evidence_records
            WHERE investigation_id = ?
        """, (inv_id,))
        evidence_items = [dict(r) for r in cursor.fetchall()]

    for cl in clusters:
        if cl.get("shared_indicators_json"):
            try:
                cl["shared_indicators"] = json.loads(cl["shared_indicators_json"])
            except Exception:
                cl["shared_indicators"] = []
        cl["members"] = [e for e in evidence_items if e.get("cluster_id") == cl["id"]]

    return jsonify({
        "clusters": clusters,
        "total_clusters": len(clusters),
        "total_records": len(evidence_items),
        "independent_records_count": sum(1 for e in evidence_items if e.get("is_independent_source") == 1)
    }), 200

@investigations_bp.route("/<inv_id>/runs", methods=["GET"])
@jwt_required
def list_analysis_runs(inv_id: str):
    """List all historical analysis execution runs for this investigation."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        cursor.execute("""
            SELECT id, run_type, status, stages_completed, used_gemini, logs, snapshot_json, started_at, completed_at
            FROM analysis_runs
            WHERE investigation_id = ?
            ORDER BY started_at DESC
        """, (inv_id,))
        runs = []
        for r in cursor.fetchall():
            rd = dict(r)
            if rd.get("stages_completed"):
                try:
                    rd["stages_completed"] = json.loads(rd["stages_completed"])
                except Exception:
                    rd["stages_completed"] = []
            if rd.get("snapshot_json"):
                try:
                    rd["snapshot"] = json.loads(rd["snapshot_json"])
                except Exception:
                    rd["snapshot"] = None
            runs.append(rd)

    return jsonify({"runs": runs, "count": len(runs)}), 200

@investigations_bp.route("/<inv_id>/runs/compare", methods=["GET"])
@jwt_required
def compare_analysis_runs(inv_id: str):
    """Compare two historical analysis runs and return granular evidence and finding deltas."""
    run_a_id = request.args.get("run_a")
    run_b_id = request.args.get("run_b")

    if not run_a_id or not run_b_id:
        return jsonify({"error": "Both 'run_a' and 'run_b' parameters are required"}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        cursor.execute("SELECT * FROM analysis_runs WHERE id = ? AND investigation_id = ?", (run_a_id, inv_id))
        row_a = cursor.fetchone()
        cursor.execute("SELECT * FROM analysis_runs WHERE id = ? AND investigation_id = ?", (run_b_id, inv_id))
        row_b = cursor.fetchone()

        if not row_a or not row_b:
            return jsonify({"error": "One or both analysis runs not found"}), 404

    snap_a = json.loads(row_a["snapshot_json"]) if row_a["snapshot_json"] else {}
    snap_b = json.loads(row_b["snapshot_json"]) if row_b["snapshot_json"] else {}

    # Calculate differences
    score_a = snap_a.get("priority_score", 0.0)
    score_b = snap_b.get("priority_score", 0.0)
    score_delta = round(score_b - score_a, 1)

    ev_ids_a = set(snap_a.get("evidence_ids", []))
    ev_ids_b = set(snap_b.get("evidence_ids", []))

    comparison = {
        "run_a": {
            "id": run_a_id,
            "started_at": row_a["started_at"],
            "status": row_a["status"],
            "priority_score": score_a,
            "priority_category": snap_a.get("priority_category", "UNKNOWN"),
            "evidence_count": snap_a.get("evidence_count", 0),
            "conflict_count": snap_a.get("conflict_count", 0),
            "evidence_confidence": snap_a.get("evidence_confidence", 0.0),
            "evidence_completeness": snap_a.get("evidence_completeness", 0.0)
        },
        "run_b": {
            "id": run_b_id,
            "started_at": row_b["started_at"],
            "status": row_b["status"],
            "priority_score": score_b,
            "priority_category": snap_b.get("priority_category", "UNKNOWN"),
            "evidence_count": snap_b.get("evidence_count", 0),
            "conflict_count": snap_b.get("conflict_count", 0),
            "evidence_confidence": snap_b.get("evidence_confidence", 0.0),
            "evidence_completeness": snap_b.get("evidence_completeness", 0.0)
        },
        "deltas": {
            "score_delta": score_delta,
            "category_transition": f"{snap_a.get('priority_category', 'UNKNOWN')} -> {snap_b.get('priority_category', 'UNKNOWN')}",
            "new_evidence_count": len(ev_ids_b - ev_ids_a),
            "removed_evidence_count": len(ev_ids_a - ev_ids_b),
            "conflict_count_delta": snap_b.get("conflict_count", 0) - snap_a.get("conflict_count", 0),
            "confidence_delta": round(snap_b.get("evidence_confidence", 0.0) - snap_a.get("evidence_confidence", 0.0), 2),
            "new_uncertainty_flags": list(set(snap_b.get("uncertainty_flags", [])) - set(snap_a.get("uncertainty_flags", []))),
            "resolved_uncertainty_flags": list(set(snap_a.get("uncertainty_flags", [])) - set(snap_b.get("uncertainty_flags", [])))
        }
    }

    return jsonify({"comparison": comparison}), 200
