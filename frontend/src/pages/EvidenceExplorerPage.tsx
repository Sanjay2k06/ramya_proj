import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { evidenceService } from '../services/api';
import { EvidenceRecord } from '../types';
import { Badge } from '../components/Badge';
import {
  Search,
  Filter,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';

export const EvidenceExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<EvidenceRecord | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvidence = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await evidenceService.list(id, {
        search: search.trim() || undefined,
        threat_category: categoryFilter || undefined,
        classification: classFilter || undefined,
      });
      setEvidenceList(res.data.evidence || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [id, search, categoryFilter, classFilter]);

  const handleInspect = async (rec: EvidenceRecord) => {
    setSelectedRecord(rec);
    try {
      const res = await evidenceService.getDetail(rec.id);
      setDetailData(res.data);
    } catch {
      setDetailData(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Evidence Explorer</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            CRYPTOGRAPHIC PROVENANCE & NORMALIZED CLAIMS INVENTORY ({total} RECORDS)
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter excerpts..."
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 font-mono w-48 shadow-subtle"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 font-mono shadow-subtle"
          >
            <option value="">All Categories</option>
            <option value="zero_day_exploitation">Zero-Day Exploitation</option>
            <option value="vulnerability_remediation">Vulnerability Remediation</option>
            <option value="threat_actor_campaign">Threat Actor Campaign</option>
            <option value="ransomware_campaign">Ransomware Campaign</option>
            <option value="ot_ics_security">OT / ICS Security</option>
            <option value="incident_forensics">Incident Forensics</option>
          </select>

          <button
            onClick={fetchEvidence}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
            title="Refresh Evidence"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="forensic-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-3 px-3.5">Evidence ID</th>
                <th className="py-3 px-3.5">Source & Provenance</th>
                <th className="py-3 px-3.5">Normalized Excerpt</th>
                <th className="py-3 px-3.5">Threat Category</th>
                <th className="py-3 px-3.5">Timestamps</th>
                <th className="py-3 px-3.5">Trust Score</th>
                <th className="py-3 px-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-mono text-slate-400">
                    QUERYING EVIDENCE REGISTRY...
                  </td>
                </tr>
              ) : evidenceList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-mono text-slate-400">
                    NO MATCHING EVIDENCE RECORDS LOCATED
                  </td>
                </tr>
              ) : (
                evidenceList.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => handleInspect(rec)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3.5 font-mono text-slate-700 font-semibold">
                      {rec.id}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {rec.source_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                        {rec.source_type}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 max-w-sm">
                      <p className="line-clamp-2 text-slate-600 leading-relaxed font-sans">
                        {rec.normalized_content || rec.original_content}
                      </p>
                    </td>
                    <td className="py-3 px-3.5">
                      <Badge variant="neutral" size="sm">
                        {rec.threat_category.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      <div>Pub: {rec.source_timestamp ? rec.source_timestamp.substring(0, 10) : 'N/A'}</div>
                      <div className="text-slate-400">Ing: {rec.collection_timestamp.substring(0, 10)}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">
                      <span className="font-semibold">{(rec.confidence_score * 100).toFixed(0)}%</span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(rec);
                        }}
                        className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Provenance Modal / Detail Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-premium space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  RECORD PROVENANCE AUDIT
                </span>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  {selectedRecord.id} — {selectedRecord.source_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                Verbatim Evidence Excerpt
              </h4>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedRecord.original_content}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block">SOURCE PUBLICATION:</span>
                <span className="font-semibold text-slate-900">{selectedRecord.source_timestamp || 'Undated'}</span>
              </div>
              <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block">SYSTEM COLLECTION:</span>
                <span className="font-semibold text-slate-900">{selectedRecord.collection_timestamp}</span>
              </div>
            </div>

            {/* Extracted Structured Claims */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono mb-2">
                Derived Claims & Triples ({detailData?.claims?.length || 0})
              </h4>
              <div className="space-y-2">
                {detailData?.claims?.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded border border-slate-200 bg-slate-50 text-xs">
                    <div className="font-semibold text-slate-900 font-sans">{c.claim_text}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{c.predicate}</span>
                      <span>Subject: {c.subject}</span>
                      <span>•</span>
                      <span>Object: {c.object}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
