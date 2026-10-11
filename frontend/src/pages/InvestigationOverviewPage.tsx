import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { investigationService } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Badge } from '../components/Badge';
import {
  FileCheck2,
  Network,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Trash2,
  RefreshCw,
  FileText,
  Flame,
  BrainCircuit,
  ShieldCheck,
  ChevronRight,
  GitCompare,
  Layers,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const InvestigationOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [clustersData, setClustersData] = useState<any>(null);
  const [runsData, setRunsData] = useState<any[]>([]);
  const [selectedRunA, setSelectedRunA] = useState<string>('');
  const [selectedRunB, setSelectedRunB] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRerunning, setIsRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [resOverview, resClusters, resRuns] = await Promise.all([
        investigationService.getOverview(id),
        investigationService.getClusters(id),
        investigationService.getRuns(id),
      ]);
      setData(resOverview.data);
      setClustersData(resClusters.data);
      const runs = resRuns.data.runs || [];
      setRunsData(runs);
      if (runs.length >= 2) {
        setSelectedRunA(runs[1].id);
        setSelectedRunB(runs[0].id);
      } else if (runs.length === 1) {
        setSelectedRunA(runs[0].id);
        setSelectedRunB(runs[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load investigation overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [id]);

  const handleRerun = async () => {
    if (!id) return;
    setIsRerunning(true);
    try {
      await investigationService.analyze(id);
      await fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rerun pipeline.');
    } finally {
      setIsRerunning(false);
    }
  };

  const handleCompare = async () => {
    if (!id || !selectedRunA || !selectedRunB) return;
    setIsComparing(true);
    try {
      const res = await investigationService.compareRuns(id, selectedRunA, selectedRunB);
      setComparisonResult(res.data.comparison);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to compare runs.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this investigation and its evidence records?')) {
      try {
        await investigationService.delete(id);
        navigate('/dashboard');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete investigation.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-500">RETRIEVING INVESTIGATION DOSSIER...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="forensic-card p-6 border-red-200 bg-red-50 text-red-700">
        <h2 className="font-semibold text-sm mb-2">Error Loading Investigation</h2>
        <p className="text-xs mb-4">{error || 'Investigation not found.'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { investigation: inv, summary } = data;
  const risk = summary.risk_assessment;

  const analysisModules = [
    { title: 'Evidence Explorer', desc: `${summary.evidence_count} ingested records with provenance`, path: `/investigations/${id}/evidence`, icon: FileCheck2 },
    { title: 'Temporal Timeline', desc: 'Chronological events and temporal anomalies', path: `/investigations/${id}/timeline`, icon: Clock },
    { title: 'Knowledge Graph', desc: `${summary.entity_count} entities in NetworkX graph`, path: `/investigations/${id}/graph`, icon: Network },
    { title: 'Conflict Detection', desc: `${summary.conflict_count} flagged contradictions & clashes`, path: `/investigations/${id}/conflicts`, icon: AlertTriangle, alert: summary.conflict_count > 0 },
    { title: 'Risk Assessment', desc: `Priority: ${risk?.overall_priority_score || 'N/A'}/100 (${risk?.priority_category || 'PENDING'})`, path: `/investigations/${id}/risk`, icon: ShieldAlert },
    { title: 'Time-to-Exploit (ML)', desc: 'Stacking Regression baseline window', path: `/investigations/${id}/time-to-exploit`, icon: Flame },
    { title: 'Explainable Reasoning', desc: '8-point transparent justification dossier', path: `/investigations/${id}/reasoning`, icon: BrainCircuit },
    { title: 'Defensive Actions', desc: `${summary.recommendation_count} evidence-backed tasks`, path: `/investigations/${id}/recommendations`, icon: ShieldCheck },
    { title: 'Forensic Report', desc: 'Downloadable JSON, CSV & HTML report', path: `/investigations/${id}/report`, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="forensic-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              INVESTIGATION WORKSPACE: {inv.id}
            </span>
            <span className="text-slate-300">•</span>
            <Badge
              variant={inv.status === 'completed' ? 'low' : inv.status === 'running' ? 'info' : 'neutral'}
              size="sm"
            >
              {inv.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">{inv.title}</h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">{inv.description || 'No hypothesis description provided.'}</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRerun}
            disabled={isRerunning}
            className="px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center space-x-1.5 shadow-subtle transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
            <span>Rerun Pipeline</span>
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 flex items-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Evidence Ingested"
          value={summary.evidence_count}
          subtext={`${clustersData?.independent_records_count || summary.evidence_count} Independent Sources`}
          icon={FileCheck2}
        />
        <MetricCard
          label="Extracted Entities"
          value={summary.entity_count}
          subtext="CVEs, IPs, Actors, Malware"
          icon={Network}
        />
        <MetricCard
          label="Contradictions"
          value={summary.conflict_count}
          subtext="Detected evidentiary clashes"
          icon={AlertTriangle}
          badge={{ text: 'FLAGGED', variant: summary.conflict_count > 0 ? 'critical' : 'low' }}
        />
        <MetricCard
          label="Operational Priority"
          value={risk?.overall_priority_score ? `${risk.overall_priority_score}/100` : 'N/A'}
          subtext={`Confidence: ${Math.round((risk?.evidence_confidence || 0.8) * 100)}%`}
          icon={ShieldAlert}
          badge={{ text: risk?.priority_category || 'PENDING', variant: 'high' }}
        />
      </div>

      {/* Source Syndication Clusters Section */}
      {clustersData && clustersData.clusters?.length > 0 && (
        <div className="forensic-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Source Independence & Syndication Clusters</h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {clustersData.total_clusters} Clusters ({clustersData.independent_records_count} independent, {clustersData.total_records - clustersData.independent_records_count} syndicated copies)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {clustersData.clusters.map((cl: any) => (
              <div key={cl.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{cl.cluster_name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {cl.member_count} {cl.member_count === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <div className="space-y-1">
                  {cl.members?.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-slate-100">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{m.source_name}</span>
                      {m.is_independent_source === 1 ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Independent
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold truncate max-w-[140px]" title={m.syndication_basis}>
                          Syndicated Copy
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Modules Grid */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-3">
          Forensic Analysis & Verification Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysisModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className="forensic-card p-5 forensic-card-interactive flex items-start justify-between group"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                      <span>{mod.title}</span>
                      {mod.alert && (
                        <span className="w-2 h-2 rounded-full bg-red-500" title="Contradictions Detected" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{mod.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Historical Analysis Runs & Run Comparison Section */}
      <div className="forensic-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Analysis Run History & Snapshot Comparison</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {runsData.length} Persisted Runs
          </span>
        </div>

        {runsData.length >= 2 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600">Compare Baseline:</span>
              <select
                value={selectedRunA}
                onChange={(e) => setSelectedRunA(e.target.value)}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                {runsData.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 10)} - {new Date(r.started_at).toLocaleTimeString()} ({r.status})
                  </option>
                ))}
              </select>
              <span className="text-xs font-bold text-slate-600">with Target:</span>
              <select
                value={selectedRunB}
                onChange={(e) => setSelectedRunB(e.target.value)}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                {runsData.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 10)} - {new Date(r.started_at).toLocaleTimeString()} ({r.status})
                  </option>
                ))}
              </select>
              <button
                onClick={handleCompare}
                disabled={isComparing || selectedRunA === selectedRunB}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isComparing ? 'Comparing...' : 'Compute Run Diff'}
              </button>
            </div>

            {/* Comparison Results Card */}
            {comparisonResult && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Run Differential Analysis
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    Category: {comparisonResult.deltas?.category_transition}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">Priority Score Delta</span>
                    <span className={`text-base font-extrabold font-mono ${comparisonResult.deltas?.score_delta >= 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                      {comparisonResult.deltas?.score_delta > 0 ? `+${comparisonResult.deltas?.score_delta}` : comparisonResult.deltas?.score_delta} pts
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">New Evidence</span>
                    <span className="text-base font-extrabold font-mono text-emerald-600">
                      +{comparisonResult.deltas?.new_evidence_count} records
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">Conflict Delta</span>
                    <span className="text-base font-extrabold font-mono text-amber-600">
                      {comparisonResult.deltas?.conflict_count_delta >= 0 ? `+${comparisonResult.deltas?.conflict_count_delta}` : comparisonResult.deltas?.conflict_count_delta}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold">Confidence Delta</span>
                    <span className="text-base font-extrabold font-mono text-slate-700">
                      {comparisonResult.deltas?.confidence_delta >= 0 ? `+${comparisonResult.deltas?.confidence_delta}` : comparisonResult.deltas?.confidence_delta}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Currently 1 analysis run recorded. Click "Rerun Pipeline" above to create a second snapshot for side-by-side comparison.</span>
          </div>
        )}
      </div>
    </div>
  );
};
