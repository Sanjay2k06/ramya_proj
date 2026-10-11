import json
import logging
import time
import requests
from typing import Dict, Any, Optional
from config import Config

logger = logging.getLogger(__name__)

class GeminiService:
    """Dedicated Google Gemini service for AI-assisted cyber threat intelligence analysis."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or Config.GEMINI_API_KEY
        self.model = model or Config.GEMINI_MODEL or "gemini-1.5-flash"
        self.timeout = Config.GEMINI_TIMEOUT_SECONDS
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def is_configured(self) -> bool:
        """Check if Gemini API key is configured."""
        return bool(self.api_key and self.api_key.strip() and not self.api_key.startswith("YOUR_"))

    def analyze_threat_claims(self, cti_text: str) -> Dict[str, Any]:
        """Invoke Gemini to perform deep semantic extraction and conflict detection on CTI text."""
        if not self.is_configured():
            return {
                "success": False,
                "used_gemini": False,
                "reason": "GEMINI_API_KEY is not configured or placeholder was provided.",
                "data": None
            }

        # Truncate text to safety limit (max 10,000 chars) to prevent token exhaustion
        sanitized_input = cti_text[:10000]

        prompt = f"""You are a specialized Cyber Threat Intelligence Forensic AI assistant.
Analyze the following CTI text to extract entities, structured claims, and potential internal/external contradictions.

Return ONLY a valid JSON object with the following exact schema:
{{
  "extracted_entities": [
    {{"type": "cve|ip|domain|hash|malware|actor|asset", "value": "identifier", "confidence": 0.0-1.0}}
  ],
  "claims": [
    {{"claim_text": "...", "subject": "...", "predicate": "EXPLOITS|ATTRIBUTED_TO|DEPLOYS|INDICATES|CONTRADICTS|CORROBORATES", "object": "...", "event_time": "YYYY-MM-DD or null"}}
  ],
  "semantic_conflicts": [
    {{"claim_a": "...", "claim_b": "...", "reason": "...", "severity": "HIGH|MEDIUM|LOW"}}
  ],
  "threat_summary": "1-2 sentence executive forensic summary"
}}

CTI TEXT TO ANALYZE:
{sanitized_input}
"""

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json"
            }
        }

        # Attempt API call with retry and exponential backoff
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                response = requests.post(
                    f"{self.base_url}?key={self.api_key}",
                    json=payload,
                    timeout=self.timeout,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    resp_data = response.json()
                    candidates = resp_data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            raw_text = parts[0]["text"].strip()
                            try:
                                parsed_json = json.loads(raw_text)
                                return {
                                    "success": True,
                                    "used_gemini": True,
                                    "data": parsed_json,
                                    "model": self.model
                                }
                            except json.JSONDecodeError as jde:
                                logger.warning(f"Gemini returned non-JSON response: {raw_text[:200]}")
                                return {
                                    "success": False,
                                    "used_gemini": True,
                                    "error": f"JSON parse error: {str(jde)}",
                                    "fallback_to_deterministic": True
                                }
                elif response.status_code == 429:
                    logger.warning("Gemini rate limit encountered. Backing off...")
                    time.sleep(2 ** attempt)
                    continue
                else:
                    logger.error(f"Gemini API returned HTTP {response.status_code}: {response.text[:200]}")
                    return {
                        "success": False,
                        "used_gemini": False,
                        "error": f"Gemini API HTTP {response.status_code}: {response.text[:150]}",
                        "fallback_to_deterministic": True
                    }

            except requests.exceptions.Timeout:
                logger.warning(f"Gemini request timed out on attempt {attempt+1}")
                if attempt == max_retries:
                    return {
                        "success": False,
                        "used_gemini": False,
                        "error": "Gemini API request timed out.",
                        "fallback_to_deterministic": True
                    }
            except Exception as e:
                logger.error(f"Unexpected error in Gemini service: {str(e)}")
                return {
                    "success": False,
                    "used_gemini": False,
                    "error": str(e),
                    "fallback_to_deterministic": True
                }

        return {
            "success": False,
            "used_gemini": False,
            "error": "Exceeded retry limits for Gemini API.",
            "fallback_to_deterministic": True
        }
