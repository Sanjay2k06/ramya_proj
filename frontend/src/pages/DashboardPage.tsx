import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Badge } from '../components/Badge';
import {
  FolderGit2,
  FileCheck2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Network,
  PlusCircle,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, trendRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTrends(),
      ]);
      setSummary(sumRes.data);
      setTrends(trendRes.data.temporal_trends || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load live dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const PIE_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#CBD5E1', '#E2E8F0'];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-500">AGGREGATING REAL-TIME SQLITE FORENSICS...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="forensic-card p-6 border-red-200 bg-red-50 text-red-700">
        <div className="flex items-center space-x-2 font-semibold text-sm mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Dashboard Error</span>
        </div>
        <p className="text-xs mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, threat_categories, source_distribution, recent_investigations } = summary;

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Forensic Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            LIVE METRICS SYNTHESIZED FROM SQLITE EVIDENCE REPOSITORY
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-white bg-slate-50 text-slate-700 flex items-center space-x-1.5 shadow-subtle transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/investigations/new')}
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Investigations"
          value={metrics.total_investigations}
          subtext="Active & completed forensic workspaces"
          icon={FolderGit2}
          badge={{ text: 'SQLITE', variant: 'info' }}
        />
        <MetricCard
          label="CTI Evidence Ingested"
          value={metrics.total_evidence_records}
          subtext="Cryptographically hashed records"
          icon={FileCheck2}
        />
        <MetricCard
          label="Corroborated Claims"
          value={metrics.corroborated_claims}
          subtext="Verified by 2+ independent sources"
          icon={Network}
          badge={{ text: 'VERIFIED', variant: 'low' }}
        />
        <MetricCard
          label="Conflicting Claims"
          value={metrics.conflicting_claims}
          subtext={`${metrics.total_conflicts} contradictions flagged`}
          icon={AlertTriangle}
          badge={{ text: 'CONTRADICTIONS', variant: 'critical' }}
        />
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Category Bar Chart */}
        <div className="forensic-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">Threat Category Distribution</h2>
              <p className="text-[11px] font-mono text-slate-500">AGGREGATED BY ATTACK VECTOR & INCIDENT TYPE</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={threat_categories} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="threat_category"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution Donut Chart */}
        <div className="forensic-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">Evidence Provenance</h2>
              <p className="text-[11px] font-mono text-slate-500">BY PUBLISHER HIERARCHY</p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {source_distribution && source_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={source_distribution}
                    dataKey="count"
                    nameKey="source_type"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {source_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400 font-mono">NO PROVENANCE DATA</span>
            )}
          </div>
        </div>
      </div>

      {/* Recent Investigations Table */}
      <div className="forensic-card p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans">Recent Investigations</h2>
            <p className="text-[11px] font-mono text-slate-500">LIVE WORKSPACES STORED IN INSTANCE/CTI_FORENSICS.DB</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {recent_investigations.length} REGISTERED DOSSIERS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3">Title / Objective</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Evidence</th>
                <th className="py-2.5 px-3">Engine</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent_investigations.map((inv: any) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/investigations/${inv.id}`)}
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {inv.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                      {inv.objective.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                        inv.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.status === 'running'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        inv.priority_category === 'CRITICAL'
                          ? 'critical'
                          : inv.priority_category === 'HIGH'
                          ? 'high'
                          : inv.priority_category === 'MEDIUM'
                          ? 'medium'
                          : 'low'
                      }
                      size="sm"
                    >
                      {inv.priority_category} ({inv.priority_score})
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {inv.evidence_count} records
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                      {inv.use_gemini ? 'HYBRID (AI+DET)' : 'DETERMINISTIC'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {inv.created_at ? inv.created_at.substring(0, 10) : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/investigations/${inv.id}`);
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                      title="Inspect Investigation"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
