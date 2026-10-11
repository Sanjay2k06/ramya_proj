# TEMPORAL CTI FORENSICS — IMPLEMENTATION ROADMAP

**Document Purpose:** Prioritized, phased implementation plan addressing all identified gaps from `FEATURE_GAP_AUDIT.md`.

---

## Phase 1: Critical Correctness & Security Foundations (Priority: P0)

### Task 1.1: Source Independence & Syndication Clustering Engine [COMPLETED AND VERIFIED]
- **Objective**: Prevent duplicated/syndicated threat blogs from counting as independent corroboration.
- **Affected Files**:
  - `backend/services/clustering_service.py`
  - `backend/services/correlation_engine.py`
  - `backend/services/pipeline.py`
  - `backend/schema.sql`
- **Database Schema Changes**:
  - Added `cluster_id TEXT`, `is_independent_source INTEGER DEFAULT 1`, `syndication_basis TEXT` to `evidence_records`.
  - Added `source_clusters` table (`id`, `investigation_id`, `cluster_name`, `representative_evidence_id`, `member_count`, `shared_indicators_json`, `created_at`).
- **Algorithm**:
  - Token-shingle Jaccard similarity (k=3) & shared CTI advisory URL matching. Only independent source clusters contribute to claim corroboration.
- **API Endpoints**:
  - `GET /api/v1/investigations/<id>/clusters`
- **Tests**: `backend/tests/test_clustering_and_decoupled_risk.py` (Verified: PASS)
- **Priority Score**: 92.25


### Task 1.2: Evidence-Gap-Aware Decoupled Risk Prioritization [COMPLETED AND VERIFIED]
- **Objective**: Ensure missing evidence does NOT artificially suppress severe vulnerabilities; decouple risk score, confidence, completeness, and uncertainty flags.
- **Affected Files**:
  - `backend/services/risk_scorer.py`
  - `backend/schema.sql`
  - `backend/database.py`
- **Database Schema Changes**:
  - Updated `risk_assessments` table to add `evidence_confidence REAL`, `evidence_completeness REAL`, `conflict_status TEXT`, `uncertainty_flags_json TEXT`, `scoring_config_version TEXT`.
- **Logic**:
  - Critical RCE with unconfirmed PoC remains in HIGH/CRITICAL queue with `uncertainty_flags = ["UNCONFIRMED_EXPLOITATION_POC"]` rather than dropping to informational.
- **API Endpoints**:
  - `GET /api/v1/investigations/<id>/risk` (enhanced payload)
- **Tests**: `backend/tests/test_clustering_and_decoupled_risk.py` (Verified: PASS)
- **Priority Score**: 88.50

---

## Phase 2: Human-in-the-Loop Verification & Core Forensic Engine (Priority: P1)

### Task 2.1: Human-in-the-Loop Finding & Claim Verification with Audit Trail [COMPLETED AND VERIFIED]
- **Objective**: Allow authorized analysts to review, verify, or dispute machine-extracted findings (`SUPPORTED`, `CONTRADICTED`, `INCONCLUSIVE`, `NEEDS_VERIFICATION`).
- **Affected Files**:
  - `backend/schema.sql`
  - `backend/routes/analysis.py`
  - `frontend/src/pages/ExplainableReasoningPage.tsx`
  - `frontend/src/services/api.ts`
- **Database Schema Changes**:
  - Added `finding_reviews` table (`id`, `investigation_id`, `finding_id`, `review_status`, `reviewer_username`, `justification`, `previous_status`, `created_at`).
- **API Endpoints**:
  - `GET /api/v1/investigations/<id>/findings/reviews`
  - `POST /api/v1/investigations/<id>/findings/<finding_id>/review`
- **Tests**: `backend/tests/test_reviews_runs_search_eval.py` (Verified: PASS)
- **Priority Score**: 86.75

### Task 2.2: Multi-Row CSV & STIX 2.1 Ingestion Engine
- **Objective**: Parse structured CSV threat feeds and STIX 2.1 JSON bundles into discrete evidence records.
- **Affected Files**:
  - `backend/services/normalization.py`
  - `backend/routes/investigations.py`
- **API Endpoints**:
  - `POST /api/v1/investigations/<id>/evidence/batch`
- **Tests**: `backend/tests/test_ingestion.py`
- **Priority Score**: 78.00

---

## Phase 3: Run Versioning & Analysis Comparison (Priority: P1)

### Task 3.1: Analysis Run Snapshots & Historical Comparison (Diffing) [COMPLETED AND VERIFIED]
- **Objective**: Preserve analysis runs across re-runs and allow analysts to compare Run A vs Run B (new evidence, changed conflicts, priority shifts).
- **Affected Files**:
  - `backend/schema.sql`
  - `backend/services/pipeline.py`
  - `backend/routes/investigations.py`
  - `frontend/src/pages/InvestigationOverviewPage.tsx`
- **Database Schema Changes**:
  - Added `snapshot_json TEXT` to `analysis_runs`.
- **API Endpoints**:
  - `GET /api/v1/investigations/<id>/runs`
  - `GET /api/v1/investigations/<id>/runs/compare?run_a=<id>&run_b=<id>`
- **Tests**: `backend/tests/test_reviews_runs_search_eval.py` (Verified: PASS)
- **Priority Score**: 85.50

---

## Phase 4: Research Evaluation Laboratory (Priority: P1)

### Task 4.1: Quantitative Benchmarking Laboratory [COMPLETED AND VERIFIED]
- **Objective**: Evaluate fake CTI detection and threat prioritization against synthetic ground truth and baseline heuristics.
- **Metrics**:
  - Classification: Precision, Recall, F1-Score, Confusion Matrix (TP, FP, TN, FN).
  - Ranking: Precision@K (P@1, P@3, P@5) and NDCG@K against reference severity order.
- **Affected Files**:
  - `backend/services/evaluation_service.py`
  - `backend/routes/evaluation.py`
  - `frontend/src/pages/EvaluationLabPage.tsx`
  - `frontend/src/components/Sidebar.tsx`
- **API Endpoints**:
  - `GET /api/v1/evaluation/benchmark`
- **Tests**: `backend/tests/test_reviews_runs_search_eval.py` (Verified: PASS)
- **Priority Score**: 84.00

---

## Phase 5: Cross-Evidence Search & Visual Traceability (Priority: P2)

### Task 5.1: Unified Cross-Evidence Workspace Search [COMPLETED AND VERIFIED]
- **Objective**: Full-text backend search querying across investigations, evidence records, entities, and claims simultaneously with permission scoping.
- **Affected Files**:
  - `backend/routes/search.py`
  - `backend/app.py`
  - `frontend/src/pages/SearchResultsPage.tsx`
  - `frontend/src/components/Navbar.tsx`
- **API Endpoints**:
  - `GET /api/v1/search?q=<query>&type=<filter>&limit=20`
- **Tests**: `backend/tests/test_reviews_runs_search_eval.py` (Verified: PASS)
- **Priority Score**: 80.25

### Task 5.2: Evidence-Chain Traceability Drilldown Modal [COMPLETED AND VERIFIED]
- **Objective**: Visual modal tracing `Finding → Claim → Evidence Record → Publisher → Timestamp & Cryptographic Hash`.
- **Affected Files**:
  - `frontend/src/components/EvidenceChainModal.tsx`
  - `frontend/src/pages/ExplainableReasoningPage.tsx`
- **Tests**: Visual verification recorded in `verify_new_features_1791734898005.webp`
- **Priority Score**: 74.00

---

## Phase 6: Interactive Knowledge Graph & Temporal Slider (Priority: P2)

### Task 6.1: Knowledge Graph Date Slider & Path Traversal
- **Objective**: Filter knowledge graph edges dynamically by observation time window and highlight conflicting paths.
- **Affected Files**:
  - `frontend/src/pages/KnowledgeGraphPage.tsx`
- **Priority Score**: 75.50
