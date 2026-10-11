import re
import uuid
from typing import List, Dict, Any
from utils.validators import is_valid_ip, is_valid_cve, is_valid_hash, CVE_REGEX, SHA256_REGEX, SHA1_REGEX, MD5_REGEX, IP_REGEX, DOMAIN_REGEX
from services.normalization import normalize_entity_value

KNOWN_ACTORS = [
    "APT-SYNTH-99", "VoltPhantom", "GhostWeaver", "DarkHydra", "ChimeraRaven",
    "Sandworm", "APT28", "APT29", "Lazarus Group", "LockBit", "BlackCat"
]

KNOWN_MALWARE = [
    "DarkHydra", "ShadowStalker", "CobaltSliver", "GhostWeaver", "RedLine",
    "Emotet", "Qakbot", "Mimikatz", "AgentTesla", "IcedID", "Cobalt Strike"
]

KNOWN_ASSETS = [
    "OmniGateway v4.2", "OmniGateway v4.1", "OmniGateway", "Modbus Gateway PLC",
    "SynthoCorp", "Active Directory", "Exchange Server", "FortiOS", "Ivanti Connect Secure"
]

def extract_entities_from_text(text: str, investigation_id: str) -> List[Dict[str, Any]]:
    """Extract cyber threat entities from CTI text using deterministic parsing."""
    entities: List[Dict[str, Any]] = []
    seen = set()

    def add_entity(etype: str, val: str, confidence: float = 0.9, context: str = ""):
        norm_val = normalize_entity_value(etype, val)
        key = (etype.lower(), norm_val)
        if key not in seen:
            seen.add(key)
            entities.append({
                "id": f"ent-{uuid.uuid4().hex[:10]}",
                "investigation_id": investigation_id,
                "entity_type": etype.lower(),
                "value": val.strip(),
                "normalized_value": norm_val,
                "first_seen": None,
                "last_seen": None,
                "confidence": confidence,
                "context": context[:200] if context else ""
            })

    # 1. CVE extraction
    for match in CVE_REGEX.finditer(text):
        cve = match.group(0)
        if is_valid_cve(cve):
            add_entity("cve", cve, 0.98, "Extracted from standard CVE pattern")

    # 2. IP extraction
    for match in IP_REGEX.finditer(text):
        ip = match.group(0)
        if is_valid_ip(ip):
            add_entity("ip", ip, 0.95, "Extracted from IPv4 pattern")

    # 3. File Hash extraction (SHA256, SHA1, MD5)
    for match in SHA256_REGEX.finditer(text):
        h = match.group(0)
        if is_valid_hash(h):
            add_entity("hash", h, 0.99, "SHA256 digest")
            
    for match in MD5_REGEX.finditer(text):
        h = match.group(0)
        # Avoid matching substring of sha256
        if is_valid_hash(h) and not any(h in e["value"] for e in entities if e["entity_type"] == "hash"):
            add_entity("hash", h, 0.90, "MD5 digest")

    # 4. Domain extraction
    for match in DOMAIN_REGEX.finditer(text):
        dom = match.group(0).lower()
        # Filter common file extensions or protocols
        if not dom.endswith((".com", ".org", ".net", ".internal", ".gov", ".io", ".edu")):
            continue
        add_entity("domain", dom, 0.88, "Domain indicator")

    # 5. Known Threat Actors
    for actor in KNOWN_ACTORS:
        if re.search(r"\b" + re.escape(actor) + r"\b", text, re.IGNORECASE):
            add_entity("actor", actor, 0.92, "Recognized adversary attribution profile")

    # 6. Known Malware
    for mal in KNOWN_MALWARE:
        if re.search(r"\b" + re.escape(mal) + r"\b", text, re.IGNORECASE):
            add_entity("malware", mal, 0.91, "Identified malware payload/tool family")

    # 7. Known Assets / Targets
    for asset in KNOWN_ASSETS:
        if re.search(r"\b" + re.escape(asset) + r"\b", text, re.IGNORECASE):
            add_entity("asset", asset, 0.85, "Affected technology stack or organizational asset")

    return entities
