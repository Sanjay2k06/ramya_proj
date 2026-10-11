import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { analysisService } from '../services/api';
import { ReasoningBlock } from '../types';
import { Badge } from '../components/Badge';
import { EvidenceChainModal } from '../components/EvidenceChainModal';
import {
  BrainCircuit,
  FileCheck2,
  Clock,
  Network,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Scale,
  Sparkles,
  Link2,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from 'lucide-react';

export const ExplainableReasoningPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [blocks, setBlocks] = useState<ReasoningBlock[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModalData, setActiveModalData] = useState<any>(null);

  // Review submission state
  const [reviewForms, setReviewForms] = useState<Record<string, { status: string; justification: string }>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);

  const fetchReasoningAndReviews = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [resReasoning, resReviews] = await Promise.all([
        analysisService.getReasoning(id),
        analysisService.getFindingReviews(id),
      ]);
      setBlocks(resReasoning.data.reasoning || []);
      setReviews(resReviews.data.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReasoningAndReviews();
  }, [id]);

  const handleFormChange = (findingId: string, field: 'status' | 'justification', val: string) => {
    setReviewForms((prev) => ({
      ...prev,
      [findingId]: {
        ...(prev[findingId] || { status: 'SUPPORTED', justification: '' }),
        [field]: val,
      },
    }));
  };

  const handleReviewSubmit = async (findingId: string, topic: string) => {
    if (!id) return;
    const form = reviewForms[findingId] || { status: 'SUPPORTED', justification: '' };
    if (!form.justification.trim()) {
      alert('Analyst justification is mandatory for audit defensibility.');
      return;
    }

    try {
      setSubmittingReview(findingId);
      await analysisService.submitFindingReview(id, findingId, {
        finding_topic: topic,
        review_status: form.status,
        justification: form.justification.trim(),
      });
      // Refresh reviews
      const resReviews = await analysisService.getFindingReviews(id);
      setReviews(resReviews.data.reviews || []);
      // Reset input text
      setReviewForms((prev) => ({
        ...prev,
        [findingId]: { status: form.status, justification: '' },
      }));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record analyst review.');
    } finally {
      setSubmittingReview(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Explainable Forensic Reasoning
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            STRUCTURED 8-POINT VERIFICATION CHAIN LINKED TO PERSISTED CTI RECORDS
          </p>
        </div>
        <button
          onClick={fetchReasoningAndReviews}
          className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
          title="Refresh Reasoning"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
          <span className="text-xs font-mono text-slate-500">
            SYNTHESIZING TRACEABLE REASONING BLOCKS...
          </span>
        </div>
      ) : blocks.length === 0 ? (
        <div className="forensic-card p-8 text-center text-slate-500 font-mono text-xs">
          No reasoning blocks synthesized for this investigation yet.
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((b) => {
            const findingReviews = reviews.filter((r) => r.finding_id === b.id);
            const currentForm = reviewForms[b.id] || { status: 'SUPPORTED', justification: '' };

            return (
              <div key={b.id} className="forensic-card p-6 space-y-4 shadow-subtle">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <BrainCircuit className="w-4 h-4 text-blue-600 shrink-0" />
                    <h2 className="text-sm font-bold text-slate-900 font-sans">{b.topic}</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setActiveModalData({
                          title: b.topic,
                          claim: {
                            claim_text: b.finding,
                            supporting_excerpt: b.evidence[0] || '',
                            confidence: b.confidence,
                          },
                          evidence: {
                            source_name: b.evidence[0] ? b.evidence[0].split('(')[0].trim() : 'CTI Stream',
                            original_content: b.evidence.join('\n\n'),
                          },
                        })
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Trace Evidence Chain
                    </button>
                    <Badge variant={b.confidence >= 0.8 ? 'low' : 'medium'} size="sm">
                      Confidence: {(b.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {/* 8-Point Forensic Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* 1. Finding */}
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[11px] font-mono text-slate-500 uppercase block">
                      1. Finding (What was detected?)
                    </span>
                    <p className="font-semibold text-slate-900 font-sans leading-relaxed">{b.finding}</p>
                  </div>

                  {/* 2. Evidence */}
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[11px] font-mono text-slate-500 uppercase block">
                      2. Supporting Evidence Records
                    </span>
                    <ul className="text-slate-800 font-mono text-[11px] space-y-0.5">
                      {b.evidence.map((ev, i) => (
                        <li key={i}>• {ev}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. Temporal Context */}
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[11px] font-mono text-slate-500 uppercase block">
                      3. Temporal Context (Chronology)
                    </span>
                    <p className="text-slate-800 font-sans leading-relaxed">{b.temporal_context}</p>
                  </div>

                  {/* 4. Corroboration */}
                  <div className="p-3 rounded-md bg-emerald-50/50 border border-emerald-200 space-y-1">
                    <span className="font-bold text-[11px] font-mono text-emerald-800 uppercase block">
                      4. Corroboration Strength
                    </span>
                    <p className="text-emerald-950 font-sans leading-relaxed">{b.corroboration}</p>
                  </div>

                  {/* 5. Contradictions */}
                  <div className="p-3 rounded-md bg-red-50/50 border border-red-200 space-y-1">
                    <span className="font-bold text-[11px] font-mono text-red-800 uppercase block">
                      5. Contradictions & Disagreements
                    </span>
                    <p className="text-red-950 font-sans leading-relaxed">{b.contradictions}</p>
                  </div>

                  {/* 6. Impact */}
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[11px] font-mono text-slate-500 uppercase block">
                      6. Operational Impact for Defenders
                    </span>
                    <p className="text-slate-800 font-sans leading-relaxed">{b.impact}</p>
                  </div>
                </div>

                {/* 7 & 8. Recommended Defensive Action */}
                <div className="p-3.5 rounded-md bg-blue-50/70 border border-blue-200 text-xs">
                  <span className="font-bold text-[11px] font-mono text-blue-900 uppercase block mb-1">
                    7 & 8. Recommended Next Steps for Analysts
                  </span>
                  <p className="text-slate-800 font-sans leading-relaxed font-semibold">
                    {b.recommended_action}
                  </p>
                </div>

                {/* Human-in-the-Loop Analyst Verification Section */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Human-in-the-Loop Analyst Verification
                      </h4>
                    </div>
                    {findingReviews.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {findingReviews.length} Prior {findingReviews.length === 1 ? 'Review' : 'Reviews'}
                      </span>
                    )}
                  </div>

                  {/* Existing Reviews List */}
                  {findingReviews.length > 0 && (
                    <div className="space-y-1.5 pb-2">
                      {findingReviews.map((rev) => (
                        <div key={rev.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {rev.review_status === 'SUPPORTED' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : rev.review_status === 'CONTRADICTED' ? (
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              {rev.review_status} (by @{rev.reviewer_username})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(rev.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] italic">"{rev.justification}"</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submission Form */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={currentForm.status}
                      onChange={(e) => handleFormChange(b.id, 'status', e.target.value)}
                      className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="SUPPORTED">SUPPORTED</option>
                      <option value="CONTRADICTED">CONTRADICTED</option>
                      <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                      <option value="NEEDS_VERIFICATION">NEEDS_VERIFICATION</option>
                    </select>
                    <input
                      type="text"
                      value={currentForm.justification}
                      onChange={(e) => handleFormChange(b.id, 'justification', e.target.value)}
                      placeholder="Mandatory analyst justification for audit trail..."
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleReviewSubmit(b.id, b.topic)}
                      disabled={submittingReview === b.id}
                      className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {submittingReview === b.id ? 'Recording...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5-Hop Evidence Traceability Modal */}
      {activeModalData && (
        <EvidenceChainModal
          isOpen={!!activeModalData}
          onClose={() => setActiveModalData(null)}
          findingTitle={activeModalData.title}
          claim={activeModalData.claim}
          evidence={activeModalData.evidence}
        />
      )}
    </div>
  );
};
