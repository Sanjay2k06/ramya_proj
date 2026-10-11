import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { analysisService } from '../services/api';
import { Conflict } from '../types';
import { Badge } from '../components/Badge';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const ConflictAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConflicts = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await analysisService.getConflicts(id);
      setConflicts(res.data.conflicts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [id]);

  const handleStatusUpdate = async (conflictId: string, newStatus: 'pending' | 'verified' | 'dismissed') => {
    try {
      await analysisService.updateConflictStatus(conflictId, { review_status: newStatus });
      setConflicts((prev) =>
        prev.map((c) => (c.id === conflictId ? { ...c, review_status: newStatus } : c))
      );
    } catch (err) {
      alert('Failed to update conflict review status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Contradiction & Conflict Analysis
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            IDENTIFIED INTELLIGENCE CLASHES, ATTRIBUTION DISPUTES & DISCREPANCY REVIEWS ({conflicts.length} FLAGGED)
          </p>
        </div>
        <button
          onClick={fetchConflicts}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle flex items-center space-x-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Conflicts</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
          <span className="text-xs font-mono text-slate-500">
            DETECTING ADVERSARY ATTRIBUTION & VERSION CONFLICTS...
          </span>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="forensic-card p-12 text-center text-slate-500 space-y-3">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No Evidentiary Contradictions Detected</h2>
          <p className="text-xs max-w-md mx-auto text-slate-600">
            All ingested threat intelligence records are internally consistent regarding vulnerabilities,
            adversary attributions, and timestamps.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conf) => (
            <div
              key={conf.id}
              className="forensic-card p-6 border-l-4 border-l-red-500 space-y-4 shadow-subtle"
            >
              {/* Top Meta Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {conf.id}
                  </span>
                  <span className="text-slate-300">•</span>
                  <Badge variant="critical" size="sm">
                    {conf.conflict_type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Confidence: {(conf.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Analyst Review Status Controls */}
                <div className="flex items-center space-x-1 font-mono text-xs">
                  <span className="text-[11px] text-slate-400 mr-1.5 uppercase">Review Status:</span>
                  <button
                    onClick={() => handleStatusUpdate(conf.id, 'pending')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      conf.review_status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(conf.id, 'verified')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      conf.review_status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Verified Clash
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(conf.id, 'dismissed')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      conf.review_status === 'dismissed'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Dismissed
                  </button>
                </div>
              </div>

              {/* Clash Comparison Grid: Claim A vs Claim B */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claim A */}
                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="font-bold text-slate-700">CLAIM A: {conf.source_a}</span>
                    <span>{conf.timestamp_a || 'Undated'}</span>
                  </div>
                  <p className="text-xs text-slate-900 font-sans font-semibold leading-relaxed">
                    "{conf.claim_a_text}"
                  </p>
                </div>

                {/* Claim B */}
                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="font-bold text-slate-700">CLAIM B: {conf.source_b}</span>
                    <span>{conf.timestamp_b || 'Undated'}</span>
                  </div>
                  <p className="text-xs text-slate-900 font-sans font-semibold leading-relaxed">
                    "{conf.claim_b_text}"
                  </p>
                </div>
              </div>

              {/* Forensics Reason */}
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1 font-bold">
                  Forensic Discrepancy Rationale
                </span>
                <p className="text-xs text-slate-800 bg-red-50/40 p-3 rounded border border-red-100 leading-relaxed font-sans">
                  {conf.reason}
                </p>
              </div>

              {/* Recommended Verification Action */}
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1 font-bold">
                  Recommended Verification Steps
                </span>
                <p className="text-xs text-slate-700 bg-blue-50/40 p-3 rounded border border-blue-100 leading-relaxed font-sans">
                  {conf.recommended_verification}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
