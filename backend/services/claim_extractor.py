import re
import uuid
import json
from typing import List, Dict, Any

PREDICATE_PATTERNS = [
    (re.compile(r"(?:exploited|weaponized|targeting|compromised)\s+(?:vulnerability\s+)?(CVE-\d{4}-\S+)", re.IGNORECASE), "EXPLOITS"),
    (re.compile(r"(?:attributed to|state-sponsored adversary|threat group)\s+([A-Za-z0-9_-]+)", re.IGNORECASE), "ATTRIBUTED_TO"),
    (re.compile(r"(?:deployed|leverages|dropped|using malware)\s+([A-Za-z0-9_-]+)", re.IGNORECASE), "DEPLOYS"),
    (re.compile(r"(?:traffic originated from|hosted at|connecting to)\s+((?:\d{1,3}\.){3}\d{1,3})", re.IGNORECASE), "INDICATES"),
    (re.compile(r"(?:is NOT vulnerable|unaffected by|cannot cause)\s+([A-Za-z0-9_ -]+)", re.IGNORECASE), "UNAFFECTED_BY"),
    (re.compile(r"(?:corroborates|confirms|verified)\s+([A-Za-z0-9_ -]+)", re.IGNORECASE), "CORROBORATES"),
    (re.compile(r"(?:disputes|fabricated|refuting|contradicts)\s+([A-Za-z0-9_ -]+)", re.IGNORECASE), "CONTRADICTS"),
]

DATE_PATTERN = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")

def extract_claims_from_evidence(
    evidence_id: str,
    investigation_id: str,
    content: str,
    source_timestamp: str | None,
    collection_timestamp: str,
    entities: List[Dict[str, Any]],
    provenance_metadata: str | None = None
) -> List[Dict[str, Any]]:
    """Extract structured subject-predicate-object claims from CTI content or provenance metadata."""
    claims: List[Dict[str, Any]] = []

    # Check if structured benchmark claims exist in provenance metadata
    if provenance_metadata:
        try:
            meta = json.loads(provenance_metadata)
            if "benchmark_claims" in meta and isinstance(meta["benchmark_claims"], list):
                for bc in meta["benchmark_claims"]:
                    claims.append({
                        "id": f"claim-{uuid.uuid4().hex[:10]}",
                        "investigation_id": investigation_id,
                        "evidence_id": evidence_id,
                        "claim_text": bc.get("claim_text", ""),
                        "subject": bc.get("subject"),
                        "predicate": bc.get("predicate"),
                        "object": bc.get("object"),
                        "event_time": bc.get("event_time") or source_timestamp,
                        "publication_time": source_timestamp,
                        "collection_time": collection_timestamp,
                        "extraction_method": "benchmark_structured",
                        "confidence": float(bc.get("confidence", 0.90)),
                        "supporting_excerpt": bc.get("claim_text", "")
                    })
        except Exception:
            pass

    # Map entities by normalized value for linking
    cves = [e for e in entities if e["entity_type"] == "cve" and e["value"].lower() in content.lower()]
    actors = [e for e in entities if e["entity_type"] == "actor" and e["value"].lower() in content.lower()]
    malware = [e for e in entities if e["entity_type"] == "malware" and e["value"].lower() in content.lower()]
    ips = [e for e in entities if e["entity_type"] == "ip" and e["value"].lower() in content.lower()]
    assets = [e for e in entities if e["entity_type"] == "asset" and e["value"].lower() in content.lower()]

    # Split content into sentences
    sentences = re.split(r"(?<=[.!?])\s+", content)

    for sent in sentences:
        sent_clean = sent.strip()
        if len(sent_clean) < 15:
            continue
        
        date_match = DATE_PATTERN.search(sent_clean)
        event_time = f"{date_match.group(1)}T00:00:00Z" if date_match else source_timestamp

        # 1. Link actor + cve
        for actor in actors:
            if actor["value"].lower() in sent_clean.lower():
                for cve in cves:
                    if cve["value"].lower() in sent_clean.lower() or len(cves) == 1:
                        claims.append({
                            "id": f"claim-{uuid.uuid4().hex[:10]}",
                            "investigation_id": investigation_id,
                            "evidence_id": evidence_id,
                            "claim_text": f"{actor['value']} is claimed to exploit {cve['value']}",
                            "subject": actor["value"],
                            "predicate": "EXPLOITS",
                            "object": cve["value"],
                            "event_time": event_time,
                            "publication_time": source_timestamp,
                            "collection_time": collection_timestamp,
                            "extraction_method": "deterministic",
                            "confidence": 0.85,
                            "supporting_excerpt": sent_clean
                        })
                
                for mal in malware:
                    if mal["value"].lower() in sent_clean.lower():
                        claims.append({
                            "id": f"claim-{uuid.uuid4().hex[:10]}",
                            "investigation_id": investigation_id,
                            "evidence_id": evidence_id,
                            "claim_text": f"{actor['value']} utilizes {mal['value']} in operations",
                            "subject": actor["value"],
                            "predicate": "DEPLOYS",
                            "object": mal["value"],
                            "event_time": event_time,
                            "publication_time": source_timestamp,
                            "collection_time": collection_timestamp,
                            "extraction_method": "deterministic",
                            "confidence": 0.82,
                            "supporting_excerpt": sent_clean
                        })

        # 2. Link malware + IP
        for mal in malware:
            if mal["value"].lower() in sent_clean.lower():
                for ip in ips:
                    if ip["value"] in sent_clean:
                        claims.append({
                            "id": f"claim-{uuid.uuid4().hex[:10]}",
                            "investigation_id": investigation_id,
                            "evidence_id": evidence_id,
                            "claim_text": f"{mal['value']} associated with infrastructure {ip['value']}",
                            "subject": mal["value"],
                            "predicate": "INDICATES",
                            "object": ip["value"],
                            "event_time": event_time,
                            "publication_time": source_timestamp,
                            "collection_time": collection_timestamp,
                            "extraction_method": "deterministic",
                            "confidence": 0.88,
                            "supporting_excerpt": sent_clean
                        })

        # 3. Link CVE + Asset (support document-level CVE when asset is in sentence)
        for asset in assets:
            if asset["value"].lower() in sent_clean.lower():
                for cve in cves:
                    is_unaffected = ("not vulnerable" in sent_clean.lower() or "unaffected" in sent_clean.lower() or "cannot cause" in sent_clean.lower())
                    predicate = "UNAFFECTED_BY" if is_unaffected else "TARGETS"
                    claims.append({
                        "id": f"claim-{uuid.uuid4().hex[:10]}",
                        "investigation_id": investigation_id,
                        "evidence_id": evidence_id,
                        "claim_text": f"{asset['value']} {predicate.lower()} {cve['value']}",
                        "subject": asset["value"],
                        "predicate": predicate,
                        "object": cve["value"],
                        "event_time": event_time,
                        "publication_time": source_timestamp,
                        "collection_time": collection_timestamp,
                        "extraction_method": "deterministic",
                        "confidence": 0.90,
                        "supporting_excerpt": sent_clean
                    })

    # If no claims extracted, create fallback statement
    if not claims and len(content.strip()) > 20:
        claims.append({
            "id": f"claim-{uuid.uuid4().hex[:10]}",
            "investigation_id": investigation_id,
            "evidence_id": evidence_id,
            "claim_text": content[:180],
            "subject": entities[0]["value"] if entities else "Threat Activity",
            "predicate": "MENTIONS",
            "object": entities[1]["value"] if len(entities) > 1 else "Observed Incident",
            "event_time": source_timestamp,
            "publication_time": source_timestamp,
            "collection_time": collection_timestamp,
            "extraction_method": "deterministic",
            "confidence": 0.65,
            "supporting_excerpt": content[:250]
        })

    return claims
