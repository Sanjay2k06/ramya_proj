from flask import Blueprint, jsonify
from database import get_db
from security.auth_helpers import jwt_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/v1/dashboard")

@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required
def get_dashboard_summary():
    """Retrieve live forensic intelligence metrics aggregated from SQLite database."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Investigations count
        cursor.execute("SELECT COUNT(*) as cnt FROM investigations")
        total_investigations = cursor.fetchone()["cnt"]

        # Evidence count
        cursor.execute("SELECT COUNT(*) as cnt FROM evidence_records")
        total_evidence = cursor.fetchone()["cnt"]

        # Claims breakdown
        cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE is_corroborated = 1")
        corroborated_claims = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE is_contradicted = 1")
        conflicting_claims = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) as cnt FROM claims WHERE is_corroborated = 0 AND is_contradicted = 0")
        unverified_claims = cursor.fetchone()["cnt"]

        # Conflicts count
        cursor.execute("SELECT COUNT(*) as cnt FROM conflicts")
        total_conflicts = cursor.fetchone()["cnt"]

        # High/Critical risk findings
        cursor.execute("SELECT COUNT(*) as cnt FROM risk_assessments WHERE priority_category IN ('CRITICAL', 'HIGH')")
        high_priority_findings = cursor.fetchone()["cnt"]

        # Threat category breakdown
        cursor.execute("""
            SELECT threat_category, COUNT(*) as count 
            FROM evidence_records 
            GROUP BY threat_category 
            ORDER BY count DESC
        """)
        threat_categories = [dict(r) for r in cursor.fetchall()]

        # Source type distribution
        cursor.execute("""
            SELECT source_type, COUNT(*) as count 
            FROM evidence_records 
            GROUP BY source_type 
            ORDER BY count DESC
        """)
        source_distribution = [dict(r) for r in cursor.fetchall()]

        # Recent investigations
        cursor.execute("""
            SELECT i.id, i.title, i.objective, i.status, i.use_gemini, i.created_at, i.updated_at,
                   COUNT(DISTINCT e.id) as evidence_count,
                   COALESCE(r.overall_priority_score, 0) as priority_score,
                   COALESCE(r.priority_category, 'PENDING') as priority_category
            FROM investigations i
            LEFT JOIN evidence_records e ON e.investigation_id = i.id
            LEFT JOIN risk_assessments r ON r.investigation_id = i.id
            GROUP BY i.id
            ORDER BY i.created_at DESC
            LIMIT 6
        """)
        recent_investigations = [dict(r) for r in cursor.fetchall()]

    return jsonify({
        "metrics": {
            "total_investigations": total_investigations,
            "total_evidence_records": total_evidence,
            "corroborated_claims": corroborated_claims,
            "conflicting_claims": conflicting_claims,
            "unverified_claims": unverified_claims,
            "total_conflicts": total_conflicts,
            "high_priority_findings": high_priority_findings
        },
        "threat_categories": threat_categories,
        "source_distribution": source_distribution,
        "recent_investigations": recent_investigations
    }), 200

@dashboard_bp.route("/trends", methods=["GET"])
@jwt_required
def get_dashboard_trends():
    """Retrieve temporal monthly/weekly threat trend aggregated from persisted records."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT SUBSTR(collection_timestamp, 1, 10) as date, COUNT(*) as count
            FROM evidence_records
            WHERE collection_timestamp IS NOT NULL
            GROUP BY date
            ORDER BY date ASC
            LIMIT 14
        """)
        records = [dict(r) for r in cursor.fetchall()]

    return jsonify({"temporal_trends": records}), 200
