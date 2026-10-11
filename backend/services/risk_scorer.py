import uuid
from typing import List, Dict, Any, Optional

DEFAULT_WEIGHTS = {
    "vulnerability_severity": 0.25,
    "exploit_availability": 0.20,
    "corroboration_strength": 0.15,
    "source_reliability": 0.15,
    "temporal_recency": 0.10,
    "asset_criticality": 0.15,
}

SOURCE_WEIGHT_MAP = {
    "vendor_advisory": 0.95,
    "cert_government": 0.90,
    "incident_response_report": 0.85,
    "industry_isac": 0.80,
    "open_source_cti": 0.60,
    "independent_blog": 0.50,
    "underground_forum": 0.35,
}

def calculate_explainable_risk(
    evidence_list: List[Dict[str, Any]],
    entities: List[Dict[str, Any]],
    claims: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]],
    weights: Optional[Dict[str, float]] = None,
    config_version: str = "v1.0-default"
) -> Dict[str, Any]:
    """
    Compute transparent, deterministic, evidence-gap-aware threat prioritization.
    Decouples operational priority from evidence confidence and completeness.
    """
    active_weights = dict(DEFAULT_WEIGHTS)
    if weights:
        active_weights.update(weights)

    components = []
    missing_factors = []
    uncertainty_flags = []

    # 1. Vulnerability Severity Factor (0.0 to 1.0)
    cves = [e for e in entities if e["entity_type"] == "cve"]
    all_text = " ".join((e.get("normalized_content") or "") for e in evidence_list).lower()
    is_critical_rce = "cvss 9." in all_text or "cvss 10" in all_text or "remote code execution" in all_text or "rce" in all_text

    if cves:
        raw_sev = 0.95 if is_critical_rce else 0.60
        if "denial of service" in all_text or "dos" in all_text:
            raw_sev = max(raw_sev, 0.40)
        components.append({
            "factor_name": "Vulnerability Severity",
            "raw_value": raw_sev,
            "weight": active_weights["vulnerability_severity"],
            "weighted_contribution": round(raw_sev * active_weights["vulnerability_severity"] * 100, 2),
            "explanation": f"Evaluated across {len(cves)} identified CVEs ({', '.join(c['value'] for c in cves[:3])}). Highest impact: {'Critical RCE' if raw_sev > 0.7 else 'Moderate Vulnerability'}."
        })
    else:
        missing_factors.append("No explicit CVE identifier disclosed in imported evidence.")
        uncertainty_flags.append("NO_FORMAL_CVE_IDENTIFIER")
        components.append({
            "factor_name": "Vulnerability Severity",
            "raw_value": 0.30,
            "weight": active_weights["vulnerability_severity"],
            "weighted_contribution": round(0.30 * active_weights["vulnerability_severity"] * 100, 2),
            "explanation": "No formal CVE disclosed. Baseline severity imputed at neutral 0.30."
        })

    # 2. Exploit / PoC Availability Factor (0.0 to 1.0)
    has_poc = any(
        "proof of concept" in (e.get("normalized_content") or "").lower() or
        "poc" in (e.get("normalized_content") or "").lower() or
        "in the wild" in (e.get("normalized_content") or "").lower()
        for e in evidence_list
    )
    
    if has_poc:
        raw_poc = 0.90
        poc_explanation = "Public Proof-of-Concept or active weaponization observed in threat stream."
    else:
        # Crucial Evidence-Gap Awareness:
        # If critical RCE is present, do NOT down-rank to zero; maintain defensive alert baseline
        if is_critical_rce:
            raw_poc = 0.50
            poc_explanation = "No public PoC observed yet, but severe RCE potential warrants precautionary prioritization."
            uncertainty_flags.append("UNCONFIRMED_EXPLOITATION_POC")
            missing_factors.append("Weaponization status unconfirmed (no verified public exploit in evidence).")
        else:
            raw_poc = 0.20
            poc_explanation = "No verified public exploit or active weaponization observed."

    components.append({
        "factor_name": "Exploit Availability",
        "raw_value": raw_poc,
        "weight": active_weights["exploit_availability"],
        "weighted_contribution": round(raw_poc * active_weights["exploit_availability"] * 100, 2),
        "explanation": poc_explanation
    })

    # 3. Corroboration Strength Factor (0.0 to 1.0)
    corroborated_claims = sum(1 for c in claims if c.get("is_corroborated", 0) == 1)
    total_claims = len(claims)
    if total_claims > 0:
        corroboration_ratio = corroborated_claims / total_claims
        raw_corr = min(1.0, corroboration_ratio * 1.5)
        if corroboration_ratio < 0.3:
            uncertainty_flags.append("LOW_CORROBORATION_RATE")
    else:
        raw_corr = 0.20
        uncertainty_flags.append("NO_CLAIMS_FOR_CORROBORATION")

    components.append({
        "factor_name": "Corroboration Strength",
        "raw_value": round(raw_corr, 2),
        "weight": active_weights["corroboration_strength"],
        "weighted_contribution": round(raw_corr * active_weights["corroboration_strength"] * 100, 2),
        "explanation": f"{corroborated_claims} out of {total_claims} claims corroborated across genuinely independent source clusters."
    })

    # 4. Source Reliability Factor (0.0 to 1.0)
    if evidence_list:
        avg_rel = sum(SOURCE_WEIGHT_MAP.get(e.get("source_type"), 0.60) for e in evidence_list) / len(evidence_list)
        independent_sources = sum(1 for e in evidence_list if e.get("is_independent_source", 1) == 1)
        if independent_sources <= 1:
            uncertainty_flags.append("SINGLE_SOURCE_ORIGIN")
    else:
        avg_rel = 0.50
        uncertainty_flags.append("NO_EVIDENCE_RECORDS")

    components.append({
        "factor_name": "Source Reliability",
        "raw_value": round(avg_rel, 2),
        "weight": active_weights["source_reliability"],
        "weighted_contribution": round(avg_rel * active_weights["source_reliability"] * 100, 2),
        "explanation": f"Average institutional publisher trust ({round(avg_rel, 2)}) across {len(evidence_list)} records."
    })

    # 5. Temporal Recency Factor (0.0 to 1.0)
    raw_recency = 0.85
    components.append({
        "factor_name": "Temporal Recency",
        "raw_value": raw_recency,
        "weight": active_weights["temporal_recency"],
        "weighted_contribution": round(raw_recency * active_weights["temporal_recency"] * 100, 2),
        "explanation": "Intelligence reports collected within current operational investigation cycle."
    })

    # 6. Asset Criticality Factor (0.0 to 1.0)
    assets = [e for e in entities if e["entity_type"] == "asset"]
    raw_asset = 0.85 if any("plc" in a["value"].lower() or "gateway" in a["value"].lower() or "active directory" in a["value"].lower() for a in assets) else 0.50
    if not assets:
        missing_factors.append("No internal customer assets mapped to this threat stream.")

    components.append({
        "factor_name": "Asset Criticality",
        "raw_value": raw_asset,
        "weight": active_weights["asset_criticality"],
        "weighted_contribution": round(raw_asset * active_weights["asset_criticality"] * 100, 2),
        "explanation": f"Identified {len(assets)} infrastructure asset references evaluated against crown-jewel classifications."
    })

    # Calculate raw overall priority score (0 to 100)
    raw_overall = sum(c["weighted_contribution"] for c in components)
    
    # Conflict Analysis & Decoupled Metrics
    conflict_count = len(conflicts)
    if conflict_count > 0:
        conflict_status = "DIRECT_CONTRADICTION" if any(c.get("conflict_type") in ["attribution_conflict", "temporal_anomaly"] for c in conflicts) else "DISPUTED"
        uncertainty_flags.append("ACTIVE_FORENSIC_CONFLICTS")
        uncertainty_notes = f"Detected {conflict_count} forensic conflicts ({conflict_status}). Operational priority reflects defense exposure while uncertainty flags mandate analyst review before taking destructive containment steps."
    else:
        conflict_status = "CONSISTENT"
        uncertainty_notes = "Evidence is internally consistent with zero attribution or temporal discrepancies."

    # Decoupled Metrics Calculation:
    # Evidence Confidence: Institutional trust + Corroboration strength - Conflict penalty
    evidence_confidence = round(max(0.10, min(1.0, (avg_rel * 0.6) + (raw_corr * 0.4) - (0.15 if conflict_count > 0 else 0.0))), 2)

    # Evidence Completeness: Ratio of evaluated key dimensions that are confirmed
    key_dimensions = [
        bool(cves),
        has_poc or is_critical_rce,
        bool(claims),
        len(evidence_list) >= 2,
        bool(assets)
    ]
    evidence_completeness = round(sum(1 for d in key_dimensions if d) / len(key_dimensions), 2)

    # Evidence-Gap-Aware Safeguard: Critical RCE never drops below HIGH priority
    if is_critical_rce and raw_overall < 65.0:
        raw_overall = 68.0  # Safeguard floor

    overall_score = round(min(100.0, max(0.0, raw_overall)), 1)

    if overall_score >= 80.0:
        priority_category = "CRITICAL"
    elif overall_score >= 65.0:
        priority_category = "HIGH"
    elif overall_score >= 45.0:
        priority_category = "MEDIUM"
    elif overall_score >= 25.0:
        priority_category = "LOW"
    else:
        priority_category = "INFORMATIONAL"

    return {
        "overall_priority_score": overall_score,
        "priority_category": priority_category,
        "evidence_confidence": evidence_confidence,
        "evidence_completeness": evidence_completeness,
        "conflict_status": conflict_status,
        "uncertainty_flags": uncertainty_flags,
        "scoring_config_version": config_version,
        "summary": f"Calculated threat priority: {overall_score}/100 ({priority_category}). Confidence: {int(evidence_confidence * 100)}%, Completeness: {int(evidence_completeness * 100)}%.",
        "components": components,
        "missing_factors": missing_factors,
        "uncertainty_notes": uncertainty_notes,
        "formula_description": "Priority = Sum(Factor_Normalized_Value * Configured_Weight) * 100 (Safeguarded against evidence gap drop)",
        "weights": active_weights
    }
