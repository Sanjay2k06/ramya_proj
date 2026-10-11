-- Temporal CTI Forensics SQLite Database Schema

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    objective TEXT DEFAULT 'defensive_prioritization',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    use_gemini INTEGER NOT NULL DEFAULT 1,
    dataset_source TEXT DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidence_records (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    source_type TEXT DEFAULT 'threat_advisory',
    original_content TEXT NOT NULL,
    normalized_content TEXT NOT NULL,
    source_timestamp TEXT,
    collection_timestamp TEXT NOT NULL,
    threat_category TEXT DEFAULT 'vulnerability_exploitation',
    classification TEXT DEFAULT 'unverified', -- verified, corroborated, conflicting, unverified
    confidence_score REAL DEFAULT 0.5,
    provenance_metadata TEXT, -- JSON metadata
    content_hash TEXT,
    cluster_id TEXT, -- Source clustering ID
    is_independent_source INTEGER DEFAULT 1, -- 1 if independent, 0 if syndicated / copied
    syndication_basis TEXT, -- Reason / citation basis for cluster
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS source_clusters (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    cluster_name TEXT NOT NULL,
    representative_evidence_id TEXT,
    member_count INTEGER DEFAULT 1,
    shared_indicators_json TEXT, -- Shared URLs, hashes, or vocabulary
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- cve, ip, domain, malware, actor, hash, tool, campaign, asset
    value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    first_seen TEXT,
    last_seen TEXT,
    confidence REAL DEFAULT 0.8,
    context TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    claim_text TEXT NOT NULL,
    subject TEXT,
    predicate TEXT,
    object TEXT,
    event_time TEXT,
    publication_time TEXT,
    collection_time TEXT,
    extraction_method TEXT DEFAULT 'deterministic', -- deterministic, gemini_assisted, hybrid
    confidence REAL DEFAULT 0.75,
    supporting_excerpt TEXT,
    is_contradicted INTEGER DEFAULT 0,
    is_corroborated INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_id) REFERENCES evidence_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claim_entities (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidence_relationships (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- MENTIONS, ATTRIBUTED_TO, TARGETS, EXPLOITS, INDICATES, SUPPORTED_BY, CONTRADICTS, OBSERVED_BEFORE, MITIGATED_BY
    weight REAL DEFAULT 1.0,
    evidence_id TEXT,
    description TEXT,
    timestamp TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_id) REFERENCES evidence_records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    claim_a_id TEXT NOT NULL,
    claim_b_id TEXT NOT NULL,
    conflict_type TEXT NOT NULL, -- attribution_conflict, temporal_anomaly, version_discrepancy, exploit_status_conflict, indicator_inconsistency
    reason TEXT NOT NULL,
    supporting_evidence TEXT, -- JSON array of evidence IDs or explanations
    confidence REAL DEFAULT 0.8,
    review_status TEXT DEFAULT 'pending', -- pending, verified, dismissed
    analyst_notes TEXT,
    recommended_verification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_a_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_b_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finding_reviews (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    finding_id TEXT NOT NULL,
    finding_topic TEXT,
    review_status TEXT NOT NULL, -- SUPPORTED, CONTRADICTED, INCONCLUSIVE, NEEDS_VERIFICATION
    reviewer_username TEXT NOT NULL,
    justification TEXT NOT NULL,
    previous_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    overall_priority_score REAL NOT NULL,
    priority_category TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    summary TEXT,
    factors_json TEXT,
    missing_factors_json TEXT,
    uncertainty_notes TEXT,
    evidence_confidence REAL DEFAULT 0.8, -- Decoupled confidence metric
    evidence_completeness REAL DEFAULT 0.7, -- Decoupled completeness metric
    conflict_status TEXT DEFAULT 'CONSISTENT', -- CONSISTENT, DISPUTED, DIRECT_CONTRADICTION
    uncertainty_flags_json TEXT DEFAULT '[]', -- Array of specific uncertainty flags
    scoring_config_version TEXT DEFAULT 'v1.0-default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS risk_score_components (
    id TEXT PRIMARY KEY,
    risk_assessment_id TEXT NOT NULL,
    factor_name TEXT NOT NULL,
    raw_value REAL NOT NULL,
    weight REAL NOT NULL,
    weighted_contribution REAL NOT NULL,
    explanation TEXT,
    FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scoring_configurations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    weights_json TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    priority TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    related_finding TEXT,
    supporting_evidence_ids TEXT, -- JSON array or comma separated
    verification_steps TEXT,
    expected_benefit TEXT,
    confidence REAL DEFAULT 0.85,
    status TEXT DEFAULT 'pending', -- pending, accepted, completed, dismissed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_runs (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    run_type TEXT DEFAULT 'full_pipeline',
    status TEXT NOT NULL, -- queued, running, completed, failed
    stages_completed TEXT, -- JSON array of strings
    used_gemini INTEGER DEFAULT 0,
    logs TEXT,
    snapshot_json TEXT, -- Full snapshot summary for run-to-run comparison
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_metadata (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    metrics_json TEXT,
    status TEXT NOT NULL, -- trained, baseline, mock, unavailable
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    investigation_id TEXT,
    event_type TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast forensics lookup and temporal queries
CREATE INDEX IF NOT EXISTS idx_investigations_user ON investigations(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_investigation ON evidence_records(investigation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_records(content_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_cluster ON evidence_records(cluster_id);
CREATE INDEX IF NOT EXISTS idx_entities_investigation ON entities(investigation_id);
CREATE INDEX IF NOT EXISTS idx_entities_val ON entities(normalized_value);
CREATE INDEX IF NOT EXISTS idx_claims_investigation ON claims(investigation_id);
CREATE INDEX IF NOT EXISTS idx_claims_evidence ON claims(evidence_id);
CREATE INDEX IF NOT EXISTS idx_relationships_investigation ON evidence_relationships(investigation_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_investigation ON conflicts(investigation_id);
CREATE INDEX IF NOT EXISTS idx_finding_reviews_inv ON finding_reviews(investigation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_investigation ON recommendations(investigation_id);
