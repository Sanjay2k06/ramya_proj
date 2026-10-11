# TEMPORAL CTI FORENSICS
**Temporal Graph-Based Forensic Framework for Fake Cyber Threat Intelligence Detection and Explainable Evidence Chaining**

---

## 1. Executive Overview

**Temporal CTI Forensics** is a full-stack cybersecurity research and operational threat intelligence platform designed to ingest cyber threat intelligence (CTI), normalize entities, correlate evidence across disparate sources, detect contradictions and fabricated claims, construct temporal knowledge graphs, prioritize operational defense, and generate explainable, auditable remediation reports.

### Core Architectural Foundations
1. **MAD-CTI Inspired Multi-Stage Pipeline**: Separation of analysis responsibilities into isolated, modular stages (normalization, entity extraction, claim extraction, correlation, conflict detection, risk scoring).
2. **ThreatWise AI Lifecycle**: Complete intelligence lifecycle from untrusted ingest to structured sharing and forensic export.
3. **Out-of-Fold Stacking Regression for Time-to-Exploit**: Clearly identified experimental ML module estimating vulnerability weaponization windows from CVSS vectors, PoC availability, and remote execution capability.
4. **Beekeeper Principle**: Structured verification, repeatable evaluation, and transparent limitations without automated arbitrary command execution.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (Research-Grade White Theme), Framer Motion, React Router v6, Recharts, React Flow (`@xyflow/react`), Lucide React, Axios.
- **Backend**: Python 3.11+, Flask, Flask-CORS, native `sqlite3` with WAL mode & foreign keys, NetworkX for multi-directed knowledge graphs, Pydantic validation, Werkzeug PBKDF2 password hashing, PyJWT, pytest.
- **AI Integration**: Official Google Gemini API (1.5 Flash / 2.0 Flash) with structured JSON extraction, timeout handling, retry backoff, and guaranteed deterministic fallback.

---

## 3. The 12-Stage Forensic Pipeline

```
[Untrusted CTI Ingest]
        ↓
1. Input Validation & Hash Deduplication (SHA-256)
        ↓
2. Canonical Normalization (Whitespace, ISO 8601 UTC, Entity Values)
        ↓
3. Deterministic Entity Extraction (CVE, IP, Domain, Hash, Actor, Malware, Asset)
        ↓
4. Structured Claim Extraction (Subject - Predicate - Object Triples)
        ↓
5. Provenance Recording (Persistent Source Metadata)
        ↓
6. Temporal Sequence Analysis (Event Time vs Publication Time vs Collection Time)
        ↓
7. Multi-Source Evidence Correlation (Shared Entities & Corroboration Clusters)
        ↓
8. Contradiction & Conflict Detection (Attribution Disputes, Version Incompatibilities)
        ↓
9. NetworkX Knowledge Graph Synthesis (Nodes, Edges, Centrality)
        ↓
10. Deterministic Risk Prioritization (Mathematical Component Decomposition)
        ↓
11. Traceable Defensive Recommendations (Linked to Evidence IDs)
        ↓
12. Multi-Format Report Generation (JSON, CSV, Standalone HTML Dossier)
```

---

## 4. Quick Start Guide (Windows 11)

### Prerequisites
- Python 3.11+ installed and accessible via `python`
- Node.js v18+ and npm installed

---

### Step 1: Backend Setup

Open PowerShell in the project root:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Configure environment variables (a pre-filled .env is already present)
# Copy example if setting up anew:
cp .env.example .env

# 6. Start the Flask Backend Server
python app.py
```
*The backend will automatically initialize the SQLite database at `instance/cti_forensics.db` and seed the initial benchmark scenario.*
*Backend URL: `http://127.0.0.1:5000`*

---

### Step 2: Frontend Setup

Open a second PowerShell terminal in the project root:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install frontend dependencies
npm install

# 3. Start the Vite Development Server
npm run dev
```
*Frontend URL: `http://localhost:5173`*

---

### Step 3: Accessing the Application

1. Open `http://localhost:5173` in your browser.
2. The **Animated Splash Screen** will display the connected evidence emblem and wordmark for 2.5 seconds, then transition to the landing page.
3. Click **"Sign In"** or **"Explore Seeded Sample Analysis"**.
4. Use the pre-seeded Analyst Account:
   - **Username**: `analyst_demo`
   - **Password**: `TemporalForensics2026!`
   *(Or click the "Fill Demo Credentials" button on the login screen).*

---

## 5. Running Automated Backend Tests

With the backend virtual environment active:

```powershell
cd backend
.\venv\Scripts\pytest -v tests
```

### Verified Test Suite:
- `test_auth.py`: Password hashing, JWT creation/verification, user registration, invalid credentials.
- `test_conflicts.py`: Version discrepancy detection, adversary attribution clash identification.
- `test_e2e_smoke.py`: Complete 12-stage end-to-end smoke test covering investigation creation, synthetic dataset ingest, timeline, knowledge graph, risk assessment, recommendations lifecycle, and report downloads.

---

## 6. Building the Frontend for Production

```powershell
cd frontend
npm run build
```
Generates optimized, type-checked production bundle in `frontend/dist/`.

---

## 7. Configuration (`backend/.env`)

```ini
# Google Gemini API Key (server-side only, never exposed to browser)
GEMINI_API_KEY=AIzaSyAd9NA4_xR-rU0MMKFbiU860SgJYzhXW9E
GEMINI_MODEL=gemini-1.5-flash
SECRET_KEY=temporal-cti-forensics-secret-key-2026-prod-grade
DATABASE_PATH=instance/cti_forensics.db
JWT_EXPIRATION_HOURS=24
```

> **Note on AI Fallback**: If `GEMINI_API_KEY` is not provided or offline, the platform automatically executes 100% of the deterministic pipeline (regex parsing, rule-based conflict detection, NetworkX graph construction, and mathematical risk scoring) without failing.

---

## 8. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new analyst profile |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT Bearer token |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile |
| `GET` | `/api/v1/dashboard/summary` | Real-time aggregated database forensics metrics |
| `GET` | `/api/v1/dashboard/trends` | Temporal threat activity volume |
| `GET` | `/api/v1/investigations` | List analyst investigations |
| `POST` | `/api/v1/investigations` | Ingest CTI & create new investigation |
| `GET` | `/api/v1/investigations/<id>` | Investigation summary and status |
| `POST` | `/api/v1/investigations/<id>/analyze` | Trigger or rerun 12-stage pipeline |
| `GET` | `/api/v1/investigations/<id>/evidence` | Searchable, paginated evidence table |
| `GET` | `/api/v1/investigations/<id>/timeline` | Chronological event sequence and anomalies |
| `GET` | `/api/v1/investigations/<id>/graph` | React Flow nodes, edges & centrality metrics |
| `GET` | `/api/v1/investigations/<id>/conflicts` | Flagged contradictions & claim pairs |
| `PATCH` | `/api/v1/investigations/conflicts/<id>` | Update conflict review status |
| `GET` | `/api/v1/investigations/<id>/risk` | Explainable multi-factor risk score |
| `GET` | `/api/v1/investigations/<id>/recommendations` | Traceable defensive actions |
| `PATCH` | `/api/v1/investigations/recommendations/<id>` | Update recommendation status |
| `GET` | `/api/v1/investigations/<id>/reasoning` | Structured 8-point explainable reasoning |
| `GET` | `/api/v1/investigations/<id>/time-to-exploit` | Experimental Stacking Regression baseline |
| `GET` | `/api/v1/reports/<id>/download?format=json\|csv\|html` | Download official forensic dossier |
| `GET` | `/api/v1/health` | Liveness health check |
| `GET` | `/api/v1/health/ready` | SQLite database integrity probe |
| `GET` | `/api/v1/settings/status` | System health, model and API status |

---

## 9. Troubleshooting

- **Port 5000 in use**: Start Flask with custom port via `PORT=5050 python app.py` and set `VITE_API_URL=http://127.0.0.1:5050/api/v1` in `frontend/.env`.
- **SQLite Database Locks**: SQLite uses WAL mode (`PRAGMA journal_mode = WAL;`) for concurrent reading and write safety. To reset the database, remove `backend/instance/cti_forensics.db*` and restart the backend.
- **CORS Issues**: Ensure the frontend is accessed from `http://localhost:5173` or `http://127.0.0.1:5173`, which are explicitly allowlisted in `backend/config.py`.
