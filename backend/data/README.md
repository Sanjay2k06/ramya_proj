# Temporal CTI Forensics — Synthetic Dataset Documentation

## Overview
This directory houses the synthetic Cyber Threat Intelligence (CTI) benchmark dataset (`synthetic_cti_dataset.json`) utilized by Temporal CTI Forensics for reproducible temporal correlation, conflict detection, knowledge graph generation, and risk prioritization evaluation.

## Ethical & Safety Disclaimer
**ALL VULNERABILITIES, ENTITY NAMES, INDICATORS OF COMPROMISE, AND ADVERSARY PROFILES ARE SYNTHETIC RESEARCH ARTIFACTS.**
- Identifiers follow synthetic naming conventions (`CVE-2026-SYNTH-XXXX`).
- IP addresses use RFC 5737 documentation blocks (`198.51.100.0/24`, `203.0.113.0/24`).
- Domains use `.example`, `.internal`, and `.test` namespaces reserved for testing (RFC 2606 / RFC 6761).
- No real-world active threats or individuals are modeled.

## Schema
Each record conforms to the following structure:
```json
{
  "id": "CTI-SYNTH-XXX",
  "source_name": "String (Advisory / Blog / CERT)",
  "source_url": "String URL",
  "source_type": "independent_blog | vendor_advisory | cert_government | open_source_cti | incident_response_report",
  "source_timestamp": "ISO 8601 UTC timestamp",
  "collection_timestamp": "ISO 8601 UTC timestamp",
  "threat_category": "zero_day_exploitation | vulnerability_remediation | threat_actor_campaign | ...",
  "confidence_score": 0.0 - 1.0,
  "original_content": "Raw untrusted CTI excerpt text",
  "entities": [
    { "type": "actor|cve|malware|ip|domain|hash|asset", "value": "Entity Identifier" }
  ],
  "claims": [
    {
      "claim_text": "Normalized claim assertion",
      "subject": "Entity A",
      "predicate": "EXPLOITS | ATTRIBUTED_TO | CONTRADICTS | CORROBORATES | ...",
      "object": "Entity B",
      "event_time": "ISO 8601 UTC timestamp"
    }
  ]
}
```

## How to Replace with Real CTI Feeds
To ingest real enterprise or open-source threat feeds (e.g., MISP, OpenCTI, AlienVault OTX, or CISA KEV):
1. In the Web UI, use the **New Investigation** page and choose "Upload JSON / CSV" or paste raw threat intelligence bulletins.
2. Alternatively, place structured JSON files matching this schema or RFC 9134 (STIX 2.1) bundles in this directory and trigger ingest through the API `/api/v1/investigations`.
