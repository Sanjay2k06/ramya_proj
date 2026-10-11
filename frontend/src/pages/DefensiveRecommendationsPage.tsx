import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { analysisService } from '../services/api';
import { Recommendation } from '../types';
import { Badge } from '../components/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ListChecks,
  ExternalLink,
  Check,
} from 'lucide-react';

export const DefensiveRecommendationsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecommendations = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await analysisService.getRecommendations(id);
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [id]);

  const handleStatusChange = async (recId: string, newStatus: string) => {
    try {
      await analysisService.updateRecommendationStatus(recId, newStatus);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status: newStatus as any } : r))
      );
    } catch (err) {
      alert('Failed to update recommendation status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Defensive Remediation Tasks
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            EVIDENCE-BACKED OPERATIONAL ACTIONS WITH LIFECYCLE MANAGEMENT ({recommendations.length} ACTIONS)
          </p>
        </div>
        <button
          onClick={fetchRecommendations}
          className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
          title="Refresh Recommendations"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
          <span className="text-xs font-mono text-slate-500">
            DERIVING DEFENSIVE VERIFICATION ACTIONS...
          </span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="forensic-card p-8 text-center text-slate-500 font-mono text-xs">
          No defensive recommendations generated for this investigation.
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`forensic-card p-6 space-y-4 shadow-subtle transition-all ${
                rec.status === 'completed'
                  ? 'opacity-70 bg-slate-50/60'
                  : rec.status === 'dismissed'
                  ? 'opacity-50'
                  : ''
              }`}
            >
              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <Badge
                    variant={
                      rec.priority === 'CRITICAL'
                        ? 'critical'
                        : rec.priority === 'HIGH'
                        ? 'high'
                        : rec.priority === 'MEDIUM'
                        ? 'medium'
                        : 'low'
                    }
                    size="sm"
                  >
                    {rec.priority} PRIORITY
                  </Badge>
                  <span className="text-xs font-mono font-bold text-slate-500">{rec.id}</span>
                </div>

                {/* Status Switcher Buttons */}
                <div className="flex items-center space-x-1 font-mono text-xs">
                  <span className="text-[11px] text-slate-400 mr-1.5 uppercase">Status:</span>
                  <button
                    onClick={() => handleStatusChange(rec.id, 'pending')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      rec.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handleStatusChange(rec.id, 'accepted')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      rec.status === 'accepted'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Accepted
                  </button>
                  <button
                    onClick={() => handleStatusChange(rec.id, 'completed')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      rec.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => handleStatusChange(rec.id, 'dismissed')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      rec.status === 'dismissed'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Dismissed
                  </button>
                </div>
              </div>

              {/* Title & Reason */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-sans mb-1">{rec.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{rec.reason}</p>
              </div>

              {/* Verification Steps */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                  Recommended Technical Verification Steps
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
                  {rec.verification_steps}
                </p>
              </div>

              {/* Expected Defensive Benefit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-500 pt-1">
                <div>
                  <span className="text-slate-400">EXPECTED BENEFIT: </span>
                  <span className="text-slate-700 font-sans">{rec.expected_benefit}</span>
                </div>
                <div className="text-[11px] mt-1 sm:mt-0">
                  Confidence: {(rec.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
