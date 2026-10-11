import os
from flask import Blueprint, jsonify
from database import get_db
from config import Config
from services.gemini_service import GeminiService

health_bp = Blueprint("health", __name__, url_prefix="/api/v1")

@health_bp.route("/health", methods=["GET"])
def health_check():
    """Liveness probe returning application health status."""
    return jsonify({
        "status": "healthy",
        "service": "TEMPORAL CTI FORENSICS",
        "version": "1.0.0",
        "architecture": "Temporal Graph-Based Forensic Framework"
    }), 200

@health_bp.route("/health/ready", methods=["GET"])
def readiness_check():
    """Readiness probe checking SQLite connectivity and database integrity."""
    db_ok = False
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            row = cursor.fetchone()
            db_ok = (row[0] == "ok")
    except Exception as e:
        return jsonify({"status": "not_ready", "database_error": str(e)}), 503

    return jsonify({
        "status": "ready",
        "database": "sqlite_connected",
        "integrity": "ok" if db_ok else "failed"
    }), 200

@health_bp.route("/settings/status", methods=["GET"])
def get_system_settings():
    """Retrieve operational system configuration, model metadata, and API status."""
    gemini = GeminiService()
    gemini_ready = gemini.is_configured()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM model_metadata")
        models = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT COUNT(*) as cnt FROM investigations")
        inv_cnt = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) as cnt FROM evidence_records")
        ev_cnt = cursor.fetchone()["cnt"]

    return jsonify({
        "application": {
            "name": "TEMPORAL CTI FORENSICS",
            "version": "1.0.0",
            "theme": "Research-Grade White",
            "mode": "Research & Academic Operations"
        },
        "database": {
            "type": "SQLite3 (Native)",
            "path": Config.DATABASE_PATH,
            "wal_mode": True,
            "foreign_keys_enforced": True,
            "total_investigations": inv_cnt,
            "total_evidence_records": ev_cnt
        },
        "ai_integration": {
            "gemini_configured": gemini_ready,
            "model_name": Config.GEMINI_MODEL,
            "timeout_seconds": Config.GEMINI_TIMEOUT_SECONDS,
            "deterministic_fallback_active": True
        },
        "models": models
    }), 200
