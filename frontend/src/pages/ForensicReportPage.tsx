import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportService } from '../services/api';
import { Badge } from '../components/Badge';
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  Shield,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const ForensicReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await reportService.getReportData(id);
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleDownload = (format: 'json' | 'csv' | 'html') => {
    if (!id) return;
    const url = reportService.getDownloadUrl(id, format);
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-500">GENERATING FORMAL FORENSIC DOSSIER...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="forensic-card p-8 text-center text-slate-500 font-mono text-xs">
        Failed to load forensic dossier.
      </div>
    );
  }

  const { metadata, executive_summary: exec, risk_assessment: risk } = report;

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Forensic Intelligence Report Dossier
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            EXPORTABLE VERIFICATION ARTIFACT • INVESTIGATION {id}
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownload('json')}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-subtle transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={() => handleDownload('csv')}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-subtle transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleDownload('html')}
            className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Standalone HTML</span>
          </button>
        </div>
      </div>

      {/* Report Preview Document */}
      <div className="forensic-card p-8 space-y-8 bg-white border-slate-300 shadow-sm max-w-4xl mx-auto">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-1">
              OFFICIAL THREAT INTELLIGENCE FORENSIC REPORT
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-sans uppercase">
              {metadata.title}
            </h2>
          </div>
          <div className="text-[11px] font-mono text-slate-500 text-right">
            <div>GENERATED: {metadata.generated_at?.substring(0, 19)}Z</div>
            <div>STATUS: {metadata.status?.toUpperCase()}</div>
          </div>
        </div>

        {/* Executive Summary Callout */}
        <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase font-mono">
              Executive Findings Summary
            </span>
            <Badge
              variant={
                exec.priority_category === 'CRITICAL'
                  ? 'critical'
                  : exec.priority_category === 'HIGH'
                  ? 'high'
                  : 'medium'
              }
            >
              Priority: {exec.priority_score}/100 ({exec.priority_category})
            </Badge>
          </div>
          <p className="text-xs text-slate-800 font-sans leading-relaxed">
            {exec.summary}
          </p>
        </div>

        {/* Quantified Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded border border-slate-200 bg-white">
            <span className="text-2xl font-bold text-slate-900 block font-sans">
              {exec.evidence_count}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Evidence Records</span>
          </div>
          <div className="p-3 rounded border border-slate-200 bg-white">
            <span className="text-2xl font-bold text-slate-900 block font-sans">
              {exec.entity_count}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Entities Analyzed</span>
          </div>
          <div className="p-3 rounded border border-slate-200 bg-white">
            <span className="text-2xl font-bold text-slate-900 block font-sans">
              {exec.conflict_count}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Contradictions</span>
          </div>
          <div className="p-3 rounded border border-slate-200 bg-white">
            <span className="text-2xl font-bold text-slate-900 block font-sans">
              {exec.recommendation_count}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Defensive Actions</span>
          </div>
        </div>

        {/* Section 1: Conflicts Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider mb-2.5 pb-1 border-b border-slate-200">
            1. Flagged Contradictions & Attribution Disputes ({report.conflicts?.length || 0})
          </h3>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Conflict Type</th>
                  <th className="p-2.5">Discrepancy Rationale</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.conflicts?.map((c: any) => (
                  <tr key={c.id}>
                    <td className="p-2.5 font-mono font-semibold text-red-700">{c.conflict_type}</td>
                    <td className="p-2.5 text-slate-800 leading-relaxed">{c.reason}</td>
                    <td className="p-2.5 font-mono uppercase">{c.review_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Defensive Actions Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider mb-2.5 pb-1 border-b border-slate-200">
            2. Prioritized Defensive Recommendations ({report.recommendations?.length || 0})
          </h3>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Priority</th>
                  <th className="p-2.5">Action Title</th>
                  <th className="p-2.5">Verification Steps</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.recommendations?.map((r: any) => (
                  <tr key={r.id}>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{r.priority}</td>
                    <td className="p-2.5 font-semibold text-slate-900">{r.title}</td>
                    <td className="p-2.5 text-slate-700 leading-relaxed">{r.verification_steps}</td>
                    <td className="p-2.5 font-mono uppercase">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Methodology & Limitations */}
        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 font-mono space-y-1">
          <div>METHODOLOGY: {report.methodology}</div>
          <div>UNCERTAINTY & LIMITATIONS: {report.uncertainty_and_limitations}</div>
        </div>
      </div>
    </div>
  );
};
