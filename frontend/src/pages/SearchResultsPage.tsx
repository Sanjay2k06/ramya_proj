import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, FolderGit2, FileText, Network, CheckCircle2, AlertTriangle, ArrowRight, Filter } from 'lucide-react';
import { searchService } from '../services/api';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'all' | 'investigations' | 'evidence' | 'entities' | 'claims'>('all');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(query);

  useEffect(() => {
    if (query) {
      handleSearch(query, activeTab);
    }
  }, [query, activeTab]);

  const handleSearch = async (q: string, type: string) => {
    if (!q.trim()) return;
    try {
      setLoading(true);
      const res = await searchService.search(q, type, 30);
      setResults(res.data);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const invMatches = results?.results?.investigations || [];
  const evMatches = results?.results?.evidence || [];
  const entMatches = results?.results?.entities || [];
  const claimMatches = results?.results?.claims || [];
  const totalMatches = results?.total_matches || 0;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Search Bar Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Unified Workspace Search</h1>
          </div>
          <form onSubmit={onSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across all investigations, evidence content, entities (CVEs, IPs), and claims..."
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {[
              { id: 'all', label: 'All Results', count: totalMatches },
              { id: 'investigations', label: 'Investigations', count: invMatches.length },
              { id: 'evidence', label: 'Evidence Records', count: evMatches.length },
              { id: 'entities', label: 'Entities & IOCs', count: entMatches.length },
              { id: 'claims', label: 'Claims', count: claimMatches.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Results Container */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Searching forensic repository...</p>
          </div>
        ) : query && totalMatches === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
            <p className="text-base font-bold text-slate-800">No matching threat intelligence records found</p>
            <p className="text-xs text-slate-500">Try searching for a specific CVE (e.g. CVE-2026-SYNTH-8901), actor, or keyword.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Investigations */}
            {(activeTab === 'all' || activeTab === 'investigations') && invMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Investigations ({invMatches.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {invMatches.map((inv: any) => (
                    <Link
                      key={inv.id}
                      to={`/investigations/${inv.id}`}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {inv.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{inv.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Records */}
            {(activeTab === 'all' || activeTab === 'evidence') && evMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Evidence Records ({evMatches.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {evMatches.map((ev: any) => (
                    <Link
                      key={ev.id}
                      to={`/investigations/${ev.investigation_id}/evidence`}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all space-y-2 block"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-900">{ev.source_name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">[{ev.source_type}]</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {ev.investigation_title}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                        {ev.original_content}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {(activeTab === 'all' || activeTab === 'entities') && entMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Extracted Entities & IOCs ({entMatches.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entMatches.map((ent: any) => (
                    <Link
                      key={ent.id}
                      to={`/investigations/${ent.investigation_id}/graph`}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all space-y-1 block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                          {ent.entity_type}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {ent.investigation_title}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 font-mono truncate">{ent.value}</p>
                      {ent.context && <p className="text-[11px] text-slate-500 truncate">{ent.context}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Claims */}
            {(activeTab === 'all' || activeTab === 'claims') && claimMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Claims & Findings ({claimMatches.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {claimMatches.map((cl: any) => (
                    <Link
                      key={cl.id}
                      to={`/investigations/${cl.investigation_id}/reasoning`}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all space-y-2 block"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{cl.claim_text}</span>
                        <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0">
                          {cl.investigation_title}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                          {cl.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                          {cl.predicate}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                          {cl.object}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
