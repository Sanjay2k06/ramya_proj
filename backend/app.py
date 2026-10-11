import os
import json
import uuid
import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import init_db, get_db
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.investigations import investigations_bp
from routes.evidence import evidence_bp
from routes.analysis import analysis_bp
from routes.reports import reports_bp
from routes.health import health_bp
from routes.evaluation import evaluation_bp
from routes.search import search_bp
from security.auth_helpers import hash_password
from services.pipeline import run_investigation_pipeline

def seed_sample_dataset_if_empty():
    """Seed initial research account and synthetic benchmark investigation if SQLite is brand new."""
    needs_pipeline_run = False
    inv_id = "inv-sample-synth-01"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        user_cnt = cursor.fetchone()["cnt"]

        demo_user_id = "user-analyst-default"
        if user_cnt == 0:
            pwd_hash = hash_password("TemporalForensics2026!")
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES (?, 'analyst_demo', 'analyst@forensics.local', ?, 'senior_analyst')
            """, (demo_user_id, pwd_hash))
            print("Seeded default analyst account: analyst_demo / TemporalForensics2026!")
        else:
            cursor.execute("SELECT id FROM users LIMIT 1")
            demo_user_id = cursor.fetchone()["id"]

        cursor.execute("SELECT COUNT(*) as cnt FROM investigations")
        inv_cnt = cursor.fetchone()["cnt"]

        if inv_cnt == 0 and Config.SYNTHETIC_DATASET_PATH.exists():
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO investigations (id, user_id, title, description, objective, status, use_gemini, dataset_source, created_at, updated_at)
                VALUES (?, ?, 'Operation DarkHydra vs VoltPhantom Attribution Analysis', 
                        'Forensic investigation evaluating zero-day RCE claims (CVE-2026-SYNTH-8901) and ransomware double-extortion discrepancies.',
                        'defensive_prioritization', 'pending', 0, 'synthetic_benchmark', ?, ?)
            """, (inv_id, demo_user_id, now_iso, now_iso))

            with open(Config.SYNTHETIC_DATASET_PATH, "r", encoding="utf-8") as f:
                synth_data = json.load(f)
                for rec in synth_data.get("records", []):
                    ev_id = f"ev-{uuid.uuid4().hex[:10]}"
                    cursor.execute("""
                        INSERT INTO evidence_records (id, investigation_id, source_name, source_url, source_type, original_content, normalized_content, source_timestamp, collection_timestamp, threat_category, classification, confidence_score, provenance_metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?)
                    """, (
                        ev_id, inv_id, rec["source_name"], rec.get("source_url"), rec.get("source_type"),
                        rec["original_content"], rec["original_content"], rec.get("source_timestamp"),
                        rec.get("collection_timestamp", now_iso), rec.get("threat_category"),
                        rec.get("confidence_score", 0.7), json.dumps({"seeded": True, "benchmark_claims": rec.get("claims", [])})
                    ))

            needs_pipeline_run = True

    # Run outside the with get_db() block to avoid nested SQLite connection locking
    if needs_pipeline_run:
        print("Seeded initial benchmark evidence records. Running initial forensic pipeline...")
        run_investigation_pipeline(inv_id, use_gemini=False)
        print("Initial benchmark pipeline execution completed!")

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure CORS with explicit origins
    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True, methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])

    # Initialize Database tables
    init_db()
    seed_sample_dataset_if_empty()

    # Centralized JSON error handling
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "details": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({"error": "Internal server error"}), 500

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(investigations_bp)
    app.register_blueprint(evidence_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(evaluation_bp)
    app.register_blueprint(search_bp)

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting Temporal CTI Forensics Backend on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
