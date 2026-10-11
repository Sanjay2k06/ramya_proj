import uuid
import json
import datetime
from flask import Blueprint, request, jsonify, g
from database import get_db
from security.auth_helpers import jwt_required
from utils.validators import calculate_sha256, sanitize_cti_text

evidence_bp = Blueprint("evidence", __name__, url_prefix="/api/v1")

@evidence_bp.route("/investigations/<inv_id>/evidence", methods=["GET"])
@jwt_required
def list_investigation_evidence(inv_id: str):
    """Retrieve evidence records with search, filtering, and pagination."""
    search = request.args.get("search", "").strip()
    source = request.args.get("source", "").strip()
    threat_category = request.args.get("threat_category", "").strip()
    classification = request.args.get("classification", "").strip()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 25))
    offset = (page - 1) * limit

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify access
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        query = "SELECT * FROM evidence_records WHERE investigation_id = ?"
        params = [inv_id]

        if search:
            query += " AND (original_content LIKE ? OR source_name LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        if source:
            query += " AND source_name LIKE ?"
            params.append(f"%{source}%")
        if threat_category:
            query += " AND threat_category = ?"
            params.append(threat_category)
        if classification:
            query += " AND classification = ?"
            params.append(classification)

        # Count total
        count_query = query.replace("SELECT *", "SELECT COUNT(*) as cnt")
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()["cnt"]

        # Fetch page
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        records = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "evidence": records,
        "total": total_count,
        "page": page,
        "limit": limit
    }), 200

@evidence_bp.route("/investigations/<inv_id>/evidence", methods=["POST"])
@jwt_required
def add_evidence(inv_id: str):
    """Ingest a new evidence record into an ongoing investigation."""
    data = request.get_json() or {}
    source_name = (data.get("source_name") or "Manual Analyst Input").strip()
    source_url = (data.get("source_url") or "").strip()
    source_type = data.get("source_type", "open_source_cti")
    content = sanitize_cti_text(data.get("content", ""))
    source_timestamp = data.get("source_timestamp")
    threat_category = data.get("threat_category", "general_intel")
    confidence_score = float(data.get("confidence_score", 0.7))

    if not content:
        return jsonify({"error": "Content cannot be empty"}), 400

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ev_id = f"ev-{uuid.uuid4().hex[:10]}"
    c_hash = calculate_sha256(content)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM investigations WHERE id = ? AND user_id = ?", (inv_id, g.current_user["id"]))
        if not cursor.fetchone():
            return jsonify({"error": "Investigation not found"}), 404

        # Deduplication check
        cursor.execute("SELECT id FROM evidence_records WHERE investigation_id = ? AND content_hash = ?", (inv_id, c_hash))
        existing = cursor.fetchone()
        if existing:
            return jsonify({"message": "Identical evidence record already exists in this investigation", "evidence_id": existing["id"], "is_duplicate": True}), 200

        cursor.execute("""
            INSERT INTO evidence_records (id, investigation_id, source_name, source_url, source_type, original_content, normalized_content, source_timestamp, collection_timestamp, threat_category, classification, confidence_score, provenance_metadata, content_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?, ?)
        """, (
            ev_id, inv_id, source_name, source_url, source_type, content, content,
            source_timestamp or now_iso, now_iso, threat_category, confidence_score,
            json.dumps({"ingested_by": g.current_user["username"]}), c_hash
        ))

    return jsonify({"message": "Evidence ingested successfully", "evidence_id": ev_id}), 201

@evidence_bp.route("/evidence/<ev_id>", methods=["GET"])
@jwt_required
def get_evidence_detail(ev_id: str):
    """Retrieve detailed evidence record with provenance and associated claims."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evidence_records WHERE id = ?", (ev_id,))
        ev = cursor.fetchone()
        if not ev:
            return jsonify({"error": "Evidence record not found"}), 404
        ev_data = dict(ev)

        # Claims associated
        cursor.execute("SELECT * FROM claims WHERE evidence_id = ?", (ev_id,))
        claims = [dict(r) for r in cursor.fetchall()]

        # Associated relationships
        cursor.execute("SELECT * FROM evidence_relationships WHERE evidence_id = ?", (ev_id,))
        relationships = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "evidence": ev_data,
        "claims": claims,
        "relationships": relationships
    }), 200
