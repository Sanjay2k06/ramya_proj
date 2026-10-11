import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from config import Config

def get_connection(db_path=None):
    """Create a configured sqlite3 connection with foreign keys and row factory."""
    path = db_path or Config.DATABASE_PATH
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    # Enforce foreign key constraints and use Write-Ahead Logging
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def get_db(db_path=None):
    """Context manager for SQLite database transactions."""
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db(db_path=None):
    """Initialize database tables and indexes from schema.sql and apply schema migrations."""
    schema_file = Path(__file__).parent / "schema.sql"
    with open(schema_file, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with get_db(db_path) as conn:
        cursor = conn.cursor()

        # Dynamic migrations for existing databases to ensure backward-compatible schema evolutions
        def ensure_column(table, column, col_type):
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if cursor.fetchone():
                cursor.execute(f"PRAGMA table_info({table})")
                cols = [row["name"] for row in cursor.fetchall()]
                if column not in cols:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

        ensure_column("evidence_records", "cluster_id", "TEXT")
        ensure_column("evidence_records", "is_independent_source", "INTEGER DEFAULT 1")
        ensure_column("evidence_records", "syndication_basis", "TEXT")

        ensure_column("risk_assessments", "evidence_confidence", "REAL DEFAULT 0.8")
        ensure_column("risk_assessments", "evidence_completeness", "REAL DEFAULT 0.7")
        ensure_column("risk_assessments", "conflict_status", "TEXT DEFAULT 'CONSISTENT'")
        ensure_column("risk_assessments", "uncertainty_flags_json", "TEXT DEFAULT '[]'")
        ensure_column("risk_assessments", "scoring_config_version", "TEXT DEFAULT 'v1.0-default'")

        ensure_column("analysis_runs", "snapshot_json", "TEXT")

        # Now execute full schema script safely
        conn.executescript(schema_sql)

        # Seed default model metadata if absent
        cursor.execute("SELECT COUNT(*) as cnt FROM model_metadata WHERE name = 'Time-to-Exploit Stacking Regression'")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("""
                INSERT INTO model_metadata (id, name, version, description, metrics_json, status)
                VALUES (
                    'tte-baseline-v1',
                    'Time-to-Exploit Stacking Regression',
                    '1.0.0-baseline',
                    'Out-of-Fold Stacking Regressor Architecture inspired by research (CVSS vector + Exploit-DB/PoC signal)',
                    '{"mae_days": 14.2, "r2_score": 0.68, "features_analyzed": ["cvss_base", "epss", "poc_published", "temporal_recency"]}',
                    'baseline'
                )
            """)

        # Seed default scoring configuration if absent
        cursor.execute("SELECT COUNT(*) as cnt FROM scoring_configurations WHERE version = 'v1.0-default'")
        if cursor.fetchone()["cnt"] == 0:
            import json
            default_weights = {
                "cvss_severity": 0.30,
                "temporal_freshness": 0.20,
                "epss_exploitation": 0.25,
                "source_corroboration": 0.15,
                "contradiction_penalty": 0.10
            }
            cursor.execute("""
                INSERT INTO scoring_configurations (id, name, version, weights_json, is_active)
                VALUES ('cfg-default-v1', 'Standard Enterprise Threat Risk Matrix', 'v1.0-default', ?, 1)
            """, (json.dumps(default_weights),))

    print(f"Database initialized and migrated at {db_path or Config.DATABASE_PATH}")

if __name__ == "__main__":
    init_db()
