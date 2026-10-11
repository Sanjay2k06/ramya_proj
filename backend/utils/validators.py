import re
import ipaddress
import hashlib
from urllib.parse import urlparse

CVE_REGEX = re.compile(r"CVE-\d{4}-[A-Za-z0-9_-]+", re.IGNORECASE)
MD5_REGEX = re.compile(r"\b[a-fA-F0-9]{32}\b")
SHA1_REGEX = re.compile(r"\b[a-fA-F0-9]{40}\b")
SHA256_REGEX = re.compile(r"\b[a-fA-F0-9]{64}\b")
DOMAIN_REGEX = re.compile(r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b")
IP_REGEX = re.compile(r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b")

def calculate_sha256(text: str) -> str:
    """Calculate SHA256 content digest for deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def is_valid_ip(ip_str: str) -> bool:
    """Check if string is a valid IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(ip_str.strip())
        return True
    except ValueError:
        return False

def is_valid_cve(cve_str: str) -> bool:
    """Check if string is a valid CVE identifier (standard or synthetic)."""
    return bool(CVE_REGEX.fullmatch(cve_str.strip()))

def is_valid_hash(hash_str: str) -> bool:
    """Check if string matches MD5, SHA1, or SHA256."""
    h = hash_str.strip()
    return bool(SHA256_REGEX.fullmatch(h) or SHA1_REGEX.fullmatch(h) or MD5_REGEX.fullmatch(h))

def sanitize_cti_text(text: str) -> str:
    """Sanitize CTI text to strip unsafe control characters and normalize newlines."""
    if not text:
        return ""
    # Normalize unicode whitespace
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace non-printable ASCII control characters except \n, \t
    cleaned = "".join(ch for ch in text if ch in "\n\t" or 32 <= ord(ch) <= 126 or ord(ch) > 127)
    return cleaned.strip()

def validate_source_url(url: str) -> bool:
    """Safely validate URL structure without following it."""
    if not url:
        return False
    try:
        parsed = urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False
