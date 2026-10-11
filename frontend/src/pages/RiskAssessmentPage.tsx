import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { analysisService } from '../services/api';
import { RiskAssessment } from '../types';
import { Badge } from '../components/Badge';
import {
  ShieldAlert,
  Calculator,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  Scale,
  FileCheck2,
} from 'lucide-react';

export const RiskAssessmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRisk = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await analysisService.getRiskAssessment(id);
      setRisk(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-500">COMPUTING DETERMINISTIC RISK PRIORITIZATION...</span>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="forensic-card p-8 text-center text-slate-500 font-mono text-xs">
        No risk assessment computed for this investigation yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Explainable Threat Risk Prioritization
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            DETERMINISTIC MULTI-FACTOR DECOMPOSITION & MATHEMATICAL TRACEABILITY
          </p>
        </div>
        <button
          onClick={fetchRisk}
          className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
          title="Recalculate Risk"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Score & Summary Card */}
      <div className="forensic-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-white via-slate-50/50 to-white">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              OPERATIONAL THREAT PRIORITY
            </span>
            <Badge
              variant={
                risk.priority_category === 'CRITICAL'
                  ? 'critical'
                  : risk.priority_category === 'HIGH'
                  ? 'high'
                  : risk.priority_category === 'MEDIUM'
                  ? 'medium'
                  : 'low'
              }
            >
              {risk.priority_category}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-slate-900 max-w-2xl leading-relaxed font-sans">
            {risk.summary}
          </p>
          {risk.uncertainty_notes && (
            <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded border border-amber-200 max-w-2xl">
              <strong>Uncertainty / Conflict Note:</strong> {risk.uncertainty_notes}
            </p>
          )}
        </div>

        {/* Priority Gauge */}
        <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 bg-white shadow-subtle shrink-0 w-44">
          <span className="text-4xl font-extrabold text-slate-900 font-sans">
            {risk.overall_priority_score}
          </span>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
            OUT OF 100
          </span>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                risk.overall_priority_score >= 80
                  ? 'bg-red-600'
                  : risk.overall_priority_score >= 65
                  ? 'bg-orange-500'
                  : risk.overall_priority_score >= 45
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${risk.overall_priority_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Factor Breakdown Bars */}
      <div className="forensic-card p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans">Factor Contribution Breakdown</h2>
            <p className="text-[11px] font-mono text-slate-500">
              FORMULA: Σ (FACTOR NORMALIZED VALUE × WEIGHT) × 100
            </p>
          </div>
          <Calculator className="w-4 h-4 text-slate-400" />
        </div>

        <div className="space-y-4">
          {risk.components.map((comp, idx) => (
            <div key={idx} className="space-y-1.5 p-3 rounded-md bg-slate-50/60 border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 font-sans">{comp.factor_name}</span>
                <div className="flex items-center space-x-3 font-mono text-[11px]">
                  <span className="text-slate-500">Weight: {(comp.weight * 100).toFixed(0)}%</span>
                  <span className="font-bold text-blue-600">
                    +{comp.weighted_contribution.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${(comp.raw_value || 0) * 100}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                {comp.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Factors & Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="forensic-card p-5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase font-mono">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Documented Missing Evidence Factors</span>
          </div>
          {risk.missing_factors.length > 0 ? (
            <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc font-sans">
              {risk.missing_factors.map((mf, i) => (
                <li key={i}>{mf}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 font-sans">
              No mandatory factors missing. Baseline telemetry fully satisfies required scoring dimensions.
            </p>
          )}
        </div>

        <div className="forensic-card p-5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase font-mono">
            <Scale className="w-4 h-4 text-slate-400" />
            <span>Confidence Limits & Defensibility</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Priority scores represent deterministic operational triage ranking. They do not constitute
            calibrated empirical breach probabilities. Always cross-reference vendor security bulletins
            prior to enacting broad containment outages.
          </p>
        </div>
      </div>
    </div>
  );
};
