import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Clock, FileText, CheckCircle2, AlertTriangle, ArrowRight, Database } from 'lucide-react';

interface EvidenceChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  findingTitle: string;
  claim?: {
    id?: string;
    claim_text?: string;
    subject?: string;
    predicate?: string;
    object?: string;
    event_time?: string;
    publication_time?: string;
    collection_time?: string;
    confidence?: number;
    is_corroborated?: number;
    is_contradicted?: number;
    supporting_excerpt?: string;
  };
  evidence?: {
    id?: string;
    source_name?: string;
    source_url?: string;
    source_type?: string;
    source_timestamp?: string;
    collection_timestamp?: string;
    original_content?: string;
    cluster_id?: string;
    is_independent_source?: number;
    syndication_basis?: string;
  };
}

export const EvidenceChainModal: React.FC<EvidenceChainModalProps> = ({
  isOpen,
  onClose,
  findingTitle,
  claim,
  evidence
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Evidence Provenance Chain</h3>
                <p className="text-xs text-slate-500 font-medium">5-Hop Forensic Traceability Drilldown</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Finding Topic */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Hop 1: Derived Forensic Finding
              </span>
              <p className="text-sm font-bold text-slate-900">{findingTitle}</p>
            </div>

            {/* Stepper Chain */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200">
              {/* Hop 2: Structured Claim */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  2
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    Hop 2: Structured Normalized Claim
                  </span>
                  <p className="text-sm text-slate-800 font-medium">{claim?.claim_text || 'Structured claim statement'}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs text-slate-700 font-mono font-semibold">
                      Subject: {claim?.subject || 'N/A'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-xs text-blue-700 font-mono font-semibold">
                      Predicate: {claim?.predicate || 'MENTIONS'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs text-slate-700 font-mono font-semibold">
                      Object: {claim?.object || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hop 3: Supporting Excerpt */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  3
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    Hop 3: Evidence Quotation / Excerpt
                  </span>
                  <blockquote className="text-xs font-mono text-slate-700 p-3 bg-slate-50 rounded-lg border-l-4 border-blue-500 whitespace-pre-wrap">
                    "{claim?.supporting_excerpt || evidence?.original_content?.slice(0, 240) || 'Raw source record text...'}"
                  </blockquote>
                </div>
              </div>

              {/* Hop 4: Source Provenance */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  4
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    Hop 4: Source Institution & Cluster Status
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{evidence?.source_name || 'Primary Intelligence Feed'}</p>
                      <p className="text-xs text-slate-500 font-mono">{evidence?.source_type || 'threat_advisory'}</p>
                    </div>
                    {evidence?.is_independent_source === 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Syndicated Copy
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Independent Source
                      </span>
                    )}
                  </div>
                  {evidence?.syndication_basis && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                      Basis: {evidence.syndication_basis}
                    </p>
                  )}
                </div>
              </div>

              {/* Hop 5: Temporal Milestones */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  5
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    Hop 5: Timestamp Chain Verification
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Event Timestamp</span>
                      <span className="text-xs font-semibold text-slate-800 font-mono">
                        {claim?.event_time ? new Date(claim.event_time).toLocaleDateString() : 'Unspecified'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Publication Time</span>
                      <span className="text-xs font-semibold text-slate-800 font-mono">
                        {evidence?.source_timestamp ? new Date(evidence.source_timestamp).toLocaleDateString() : 'Recorded'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Collection Time</span>
                      <span className="text-xs font-semibold text-slate-800 font-mono">
                        {evidence?.collection_timestamp ? new Date(evidence.collection_timestamp).toLocaleDateString() : 'Ingested'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Close Traceability View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
