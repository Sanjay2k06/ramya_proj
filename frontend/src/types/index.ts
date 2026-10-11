export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface Investigation {
  id: string;
  user_id: string;
  title: string;
  description: string;
  objective: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  use_gemini: number;
  dataset_source: string;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  entity_count?: number;
  conflict_count?: number;
  priority_score?: number;
  priority_category?: string;
}

export interface EvidenceRecord {
  id: string;
  investigation_id: string;
  source_name: string;
  source_url?: string;
  source_type: string;
  original_content: string;
  normalized_content: string;
  source_timestamp?: string;
  collection_timestamp: string;
  threat_category: string;
  classification: 'verified' | 'corroborated' | 'conflicting' | 'unverified';
  confidence_score: number;
  provenance_metadata?: string;
  content_hash?: string;
  created_at: string;
}

export interface Entity {
  id: string;
  investigation_id: string;
  entity_type: 'cve' | 'ip' | 'domain' | 'malware' | 'actor' | 'hash' | 'tool' | 'campaign' | 'asset' | 'generic';
  value: string;
  normalized_value: string;
  first_seen?: string;
  last_seen?: string;
  confidence: number;
  context?: string;
}

export interface Claim {
  id: string;
  investigation_id: string;
  evidence_id: string;
  claim_text: string;
  subject?: string;
  predicate?: string;
  object?: string;
  event_time?: string;
  publication_time?: string;
  collection_time?: string;
  extraction_method: string;
  confidence: number;
  supporting_excerpt?: string;
  is_contradicted: number;
  is_corroborated: number;
}

export interface Conflict {
  id: string;
  investigation_id: string;
  claim_a_id: string;
  claim_b_id: string;
  claim_a_text?: string;
  claim_b_text?: string;
  source_a?: string;
  source_b?: string;
  timestamp_a?: string;
  timestamp_b?: string;
  conflict_type: string;
  reason: string;
  supporting_evidence?: string;
  confidence: number;
  review_status: 'pending' | 'verified' | 'dismissed';
  analyst_notes?: string;
  recommended_verification?: string;
  created_at?: string;
}

export interface RiskScoreComponent {
  id?: string;
  factor_name: string;
  raw_value: number;
  weight: number;
  weighted_contribution: number;
  explanation: string;
}

export interface RiskAssessment {
  id: string;
  investigation_id: string;
  overall_priority_score: number;
  priority_category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  summary: string;
  components: RiskScoreComponent[];
  missing_factors: string[];
  uncertainty_notes: string;
  formula_description?: string;
}

export interface Recommendation {
  id: string;
  investigation_id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  reason: string;
  related_finding?: string;
  supporting_evidence_ids?: string;
  verification_steps?: string;
  expected_benefit?: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'completed' | 'dismissed';
}

export interface TimelineEvent {
  id: string;
  claim_id: string;
  evidence_id?: string;
  source_name: string;
  title: string;
  description: string;
  subject?: string;
  predicate?: string;
  object?: string;
  event_time?: string;
  publication_time?: string;
  collection_time?: string;
  has_unknown_time: boolean;
  threat_category: string;
  confidence: number;
  is_contradicted: number;
}

export interface ReasoningBlock {
  id: string;
  topic: string;
  finding: string;
  evidence: string[];
  temporal_context: string;
  corroboration: string;
  contradictions: string;
  confidence: number;
  impact: string;
  recommended_action: string;
}

export interface TimeToExploitPrediction {
  cve_id: string;
  model_status: string;
  is_experimental: boolean;
  predicted_days_to_exploit: number;
  urgency_level: string;
  feature_contributions: Array<{
    feature: string;
    value: number;
    contribution_direction: string;
  }>;
  evaluation_metrics: {
    validation_framework: string;
    benchmark_mae_days: number;
    benchmark_r2: number;
    training_dataset_status: string;
  };
  disclaimer: string;
}
