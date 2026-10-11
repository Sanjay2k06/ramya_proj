from flask import Blueprint, request, jsonify, g
from database import get_db
from security.auth_helpers import jwt_required

search_bp = Blueprint("search", __name__, url_prefix="/api/v1/search")

@search_bp.route("", methods=["GET"])
@jwt_required
def search_workspace():
    """
    Search across accessible investigations, evidence records, entities, and claims.
    Fully parameterized against SQL injection.
    """
    query = (request.args.get("q") or "").strip()
    search_type = request.args.get("type", "all").lower()
    limit = min(50, max(1, int(request.args.get("limit", 20))))

    if not query:
        return jsonify({
            "query": "",
            "total_matches": 0,
            "results": {
                "investigations": [],
                "evidence": [],
                "entities": [],
                "claims": []
            }
        }), 200

    like_pattern = f"%{query}%"
    user_id = g.current_user["id"]

    results = {
        "investigations": [],
        "evidence": [],
        "entities": [],
        "claims": []
    }

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Search Investigations
        if search_type in ("all", "investigation", "investigations"):
            cursor.execute("""
                SELECT i.id, i.title, i.description, i.objective, i.status, i.created_at,
                       COALESCE(r.overall_priority_score, 0) as priority_score,
                       COALESCE(r.priority_category, 'PENDING') as priority_category
                FROM investigations i
                LEFT JOIN risk_assessments r ON r.investigation_id = i.id
                WHERE i.user_id = ? AND (i.title LIKE ? OR i.description LIKE ?)
                ORDER BY i.created_at DESC
                LIMIT ?
            """, (user_id, like_pattern, like_pattern, limit))
            results["investigations"] = [dict(r) for r in cursor.fetchall()]

        # 2. Search Evidence Records
        if search_type in ("all", "evidence"):
            cursor.execute("""
                SELECT e.id, e.investigation_id, e.source_name, e.source_type, e.original_content, e.source_timestamp,
                       i.title as investigation_title
                FROM evidence_records e
                JOIN investigations i ON i.id = e.investigation_id
                WHERE i.user_id = ? AND (e.original_content LIKE ? OR e.source_name LIKE ?)
                ORDER BY e.created_at DESC
                LIMIT ?
            """, (user_id, like_pattern, like_pattern, limit))
            results["evidence"] = [dict(r) for r in cursor.fetchall()]

        # 3. Search Entities
        if search_type in ("all", "entity", "entities"):
            cursor.execute("""
                SELECT ent.id, ent.investigation_id, ent.entity_type, ent.value, ent.context,
                       i.title as investigation_title
                FROM entities ent
                JOIN investigations i ON i.id = ent.investigation_id
                WHERE i.user_id = ? AND (ent.value LIKE ? OR ent.context LIKE ?)
                ORDER BY ent.created_at DESC
                LIMIT ?
            """, (user_id, like_pattern, like_pattern, limit))
            results["entities"] = [dict(r) for r in cursor.fetchall()]

        # 4. Search Claims
        if search_type in ("all", "claim", "claims"):
            cursor.execute("""
                SELECT cl.id, cl.investigation_id, cl.evidence_id, cl.claim_text, cl.subject, cl.predicate, cl.object,
                       cl.is_corroborated, cl.is_contradicted, cl.event_time,
                       i.title as investigation_title
                FROM claims cl
                JOIN investigations i ON i.id = cl.investigation_id
                WHERE i.user_id = ? AND (cl.claim_text LIKE ? OR cl.subject LIKE ? OR cl.object LIKE ?)
                ORDER BY cl.created_at DESC
                LIMIT ?
            """, (user_id, like_pattern, like_pattern, like_pattern, limit))
            results["claims"] = [dict(r) for r in cursor.fetchall()]

    total = sum(len(v) for v in results.values())
    return jsonify({
        "query": query,
        "total_matches": total,
        "results": results
    }), 200
