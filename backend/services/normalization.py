import re
from datetime import datetime, timezone
from utils.validators import sanitize_cti_text

def normalize_text(text: str) -> str:
    """Normalize raw CTI text into cleaned canonical text."""
    if not text:
        return ""
    cleaned = sanitize_cti_text(text)
    # Collapse multiple whitespace
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    # Collapse 3+ newlines into 2
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()

def parse_iso_timestamp(ts_str: str) -> str | None:
    """Parse various timestamp strings and return ISO 8601 UTC string."""
    if not ts_str:
        return None
    ts_str = ts_str.strip()
    # Try ISO formats
    formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(ts_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            continue
    return None

def normalize_entity_value(entity_type: str, value: str) -> str:
    """Normalize entity value based on type (lowercase for CVE/IP/Domain/Hash)."""
    val = value.strip()
    t = entity_type.lower()
    if t == "cve":
        return val.upper()
    elif t in ("ip", "domain", "hash"):
        return val.lower()
    elif t in ("malware", "actor"):
        # Title case or canonical naming
        return val.strip()
    return val
