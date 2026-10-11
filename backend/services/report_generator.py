import json
import csv
import io
import datetime
from typing import Dict, Any
from database import get_db

def build_investigation_report_data(investigation_id: str) -> Dict[str, Any]:
    """Retrieve full persisted investigation data for forensic report rendering."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Investigation metadata
        cursor.execute("SELECT * FROM investigations WHERE id = ?", (investigation_id,))
        inv = cursor.fetchone()
        if not inv:
            raise ValueError(f"Investigation {investigation_id} not found")
        inv_data = dict(inv)

        # Evidence
        cursor.execute("SELECT * FROM evidence_records WHERE investigation_id = ?", (investigation_id,))
        evidence = [dict(r) for r in cursor.fetchall()]

        # Entities
        cursor.execute("SELECT * FROM entities WHERE investigation_id = ?", (investigation_id,))
        entities = [dict(r) for r in cursor.fetchall()]

        # Claims
        cursor.execute("SELECT * FROM claims WHERE investigation_id = ?", (investigation_id,))
        claims = [dict(r) for r in cursor.fetchall()]

        # Conflicts
        cursor.execute("SELECT * FROM conflicts WHERE investigation_id = ?", (investigation_id,))
        conflicts = [dict(r) for r in cursor.fetchall()]

        # Risk Assessment
        cursor.execute("SELECT * FROM risk_assessments WHERE investigation_id = ?", (investigation_id,))
        risk_row = cursor.fetchone()
        risk_data = dict(risk_row) if risk_row else {}

        if risk_data:
            cursor.execute("SELECT * FROM risk_score_components WHERE risk_assessment_id = ?", (risk_data.get("id"),))
            risk_data["components"] = [dict(r) for r in cursor.fetchall()]

        # Recommendations
        cursor.execute("SELECT * FROM recommendations WHERE investigation_id = ?", (investigation_id,))
        recommendations = [dict(r) for r in cursor.fetchall()]

        # Analysis runs
        cursor.execute("SELECT * FROM analysis_runs WHERE investigation_id = ? ORDER BY started_at DESC LIMIT 1", (investigation_id,))
        run_row = cursor.fetchone()
        last_run = dict(run_row) if run_row else {}

    return {
        "metadata": {
            "title": f"FORENSIC INTELLIGENCE DOSSIER — {inv_data.get('title')}",
            "investigation_id": investigation_id,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "objective": inv_data.get("objective"),
            "status": inv_data.get("status"),
            "used_gemini": bool(inv_data.get("use_gemini")),
            "last_run": last_run
        },
        "executive_summary": {
            "priority_score": risk_data.get("overall_priority_score", 0),
            "priority_category": risk_data.get("priority_category", "UNKNOWN"),
            "summary": risk_data.get("summary", "No risk assessment recorded."),
            "evidence_count": len(evidence),
            "entity_count": len(entities),
            "claim_count": len(claims),
            "conflict_count": len(conflicts),
            "recommendation_count": len(recommendations)
        },
        "methodology": "12-Stage Temporal Forensic Correlation Pipeline (MAD-CTI / ThreatWise Architecture with NetworkX Graph & Deterministic Scoring).",
        "evidence_inventory": evidence,
        "entities": entities,
        "claims": claims,
        "conflicts": conflicts,
        "risk_assessment": risk_data,
        "recommendations": recommendations,
        "uncertainty_and_limitations": risk_data.get("uncertainty_notes", "Evidence is subject to source publication veracity.")
    }

def generate_csv_report(report_data: Dict[str, Any]) -> str:
    """Generate tabular CSV report of evidence and findings."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Metadata header
    writer.writerow(["TEMPORAL CTI FORENSICS — INVESTIGATION REPORT"])
    writer.writerow(["Investigation ID", report_data["metadata"]["investigation_id"]])
    writer.writerow(["Generated At", report_data["metadata"]["generated_at"]])
    writer.writerow(["Priority Score", report_data["executive_summary"]["priority_score"]])
    writer.writerow(["Priority Category", report_data["executive_summary"]["priority_category"]])
    writer.writerow([])

    # Evidence Records
    writer.writerow(["EVIDENCE RECORDS"])
    writer.writerow(["ID", "Source", "Type", "Timestamp", "Category", "Confidence", "Classification"])
    for ev in report_data["evidence_inventory"]:
        writer.writerow([ev["id"], ev["source_name"], ev["source_type"], ev.get("source_timestamp", "N/A"), ev["threat_category"], ev["confidence_score"], ev["classification"]])
    writer.writerow([])

    # Conflicts
    writer.writerow(["IDENTIFIED CONFLICTS & CONTRADICTIONS"])
    writer.writerow(["ID", "Type", "Reason", "Confidence", "Status", "Recommended Verification"])
    for conf in report_data["conflicts"]:
        writer.writerow([conf["id"], conf["conflict_type"], conf["reason"], conf["confidence"], conf["review_status"], conf["recommended_verification"]])
    writer.writerow([])

    # Defensive Recommendations
    writer.writerow(["DEFENSIVE RECOMMENDATIONS"])
    writer.writerow(["ID", "Priority", "Title", "Reason", "Verification Steps", "Status"])
    for rec in report_data["recommendations"]:
        writer.writerow([rec["id"], rec["priority"], rec["title"], rec["reason"], rec["verification_steps"], rec["status"]])

    return output.getvalue()

def generate_html_report(report_data: Dict[str, Any]) -> str:
    """Generate printable, standalone HTML forensic intelligence report."""
    m = report_data["metadata"]
    s = report_data["executive_summary"]
    r = report_data["risk_assessment"]
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{m['title']}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }}
        h1 {{ font-size: 24px; font-weight: 700; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 8px; }}
        .header-meta {{ font-size: 13px; color: #64748b; margin-bottom: 30px; }}
        .badge {{ display: inline-block; padding: 3px 8px; font-size: 12px; font-weight: 600; border-radius: 4px; }}
        .badge-critical {{ background: #fee2e2; color: #dc2626; }}
        .badge-high {{ background: #ffedd5; color: #ea580c; }}
        .badge-medium {{ background: #fef3c7; color: #d97706; }}
        .metric-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }}
        .metric-box {{ border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; background: #f8fafc; }}
        .metric-val {{ font-size: 24px; font-weight: 700; color: #0f172a; }}
        .metric-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 16px 0 32px; font-size: 13px; }}
        th, td {{ border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }}
        th {{ background: #f1f5f9; font-weight: 600; }}
        .section-title {{ font-size: 18px; font-weight: 600; margin-top: 32px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }}
        .callout {{ background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0; }}
    </style>
</head>
<body>
    <h1>TEMPORAL CTI FORENSICS — OFFICIAL DOSSIER</h1>
    <div class="header-meta">
        <strong>Investigation:</strong> {m['title']} | <strong>Generated:</strong> {m['generated_at']} | <strong>Engine:</strong> {report_data['methodology']}
    </div>

    <div class="callout">
        <strong>Executive Rationale:</strong> {s['summary']}
    </div>

    <div class="metric-grid">
        <div class="metric-box">
            <div class="metric-val">{s['priority_score']}/100</div>
            <div class="metric-label">Operational Priority</div>
        </div>
        <div class="metric-box">
            <div class="metric-val">{s['evidence_count']}</div>
            <div class="metric-label">Evidence Ingested</div>
        </div>
        <div class="metric-box">
            <div class="metric-val">{s['conflict_count']}</div>
            <div class="metric-label">Contradictions Found</div>
        </div>
        <div class="metric-box">
            <div class="metric-val">{s['recommendation_count']}</div>
            <div class="metric-label">Defensive Actions</div>
        </div>
    </div>

    <h2 class="section-title">1. Discovered Conflicts & Forensic Inconsistencies</h2>
    <table>
        <thead>
            <tr>
                <th>Conflict Type</th>
                <th>Reason & Discrepancy</th>
                <th>Status</th>
                <th>Recommended Verification</th>
            </tr>
        </thead>
        <tbody>
            {"".join(f"<tr><td><strong>{c['conflict_type']}</strong></td><td>{c['reason']}</td><td>{c['review_status']}</td><td>{c['recommended_verification']}</td></tr>" for c in report_data['conflicts'])}
        </tbody>
    </table>

    <h2 class="section-title">2. Prioritized Defensive Actions</h2>
    <table>
        <thead>
            <tr>
                <th>Priority</th>
                <th>Action Title</th>
                <th>Justification</th>
                <th>Verification Steps</th>
            </tr>
        </thead>
        <tbody>
            {"".join(f"<tr><td><span class='badge badge-critical'>{r['priority']}</span></td><td><strong>{r['title']}</strong></td><td>{r['reason']}</td><td>{r['verification_steps']}</td></tr>" for r in report_data['recommendations'])}
        </tbody>
    </table>

    <h2 class="section-title">3. Forensic Evidence Inventory</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Source Publisher</th>
                <th>Timestamp</th>
                <th>Category</th>
                <th>Confidence</th>
            </tr>
        </thead>
        <tbody>
            {"".join(f"<tr><td><code>{e['id']}</code></td><td>{e['source_name']}</td><td>{e.get('source_timestamp', 'N/A')}</td><td>{e['threat_category']}</td><td>{e['confidence_score']}</td></tr>" for e in report_data['evidence_inventory'])}
        </tbody>
    </table>

    <div class="header-meta" style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <em>Notice: This dossier is synthesized from verified CTI graph correlation. All recommendations require authorized analyst confirmation prior to automated system isolation.</em>
    </div>
</body>
</html>"""
    return html
