import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { investigationService } from '../services/api';
import {
  PlusCircle,
  FileText,
  Upload,
  Database,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const NewInvestigationPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('defensive_prioritization');
  const [ingestMode, setIngestMode] = useState<'synthetic' | 'paste' | 'upload'>('synthetic');
  const [pastedCti, setPastedCti] = useState('');
  const [useGemini, setUseGemini] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Investigation title is required.');
      return;
    }

    setIsSubmitting(true);
    setCurrentStage('1_input_validation');

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        objective,
        use_gemini: useGemini,
        auto_analyze: true,
      };

      if (ingestMode === 'synthetic') {
        payload.dataset_source = 'synthetic_benchmark';
      } else if (ingestMode === 'paste') {
        payload.dataset_source = 'manual_paste';
        payload.pasted_cti = pastedCti;
      } else {
        payload.dataset_source = 'uploaded_file';
        payload.pasted_cti = pastedCti;
      }

      setCurrentStage('processing_pipeline');
      const res = await investigationService.create(payload);
      const invId = res.data.investigation_id;

      setCurrentStage('completed');
      setTimeout(() => {
        navigate(`/investigations/${invId}`);
      }, 700);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize investigation.');
      setIsSubmitting(false);
      setCurrentStage(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPastedCti(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Initialize Forensic Investigation
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          INGEST THREAT INTELLIGENCE & TRIGGER TEMPORAL CONFLICT ANALYSIS
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="forensic-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
            1. Investigation Metadata
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Investigation Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Campaign VoltPhantom: Edge Gateway Zero-Day Attribution Verification"
              className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 font-sans transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Scope & Hypothesis Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clarify operational hypothesis, target software versions, or suspected false attribution claims..."
              className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 font-sans transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              Defensive Research Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 font-mono transition-colors"
            >
              <option value="defensive_prioritization">Defensive Vulnerability & Threat Prioritization</option>
              <option value="attribution_verification">Adversary Attribution & False-Flag Verification</option>
              <option value="zero_day_triage">Zero-Day Exploitation & Version Scope Validation</option>
              <option value="incident_forensics">Incident Exfiltration Veracity Assessment</option>
            </select>
          </div>
        </div>

        {/* Section 2: Ingestion Mode */}
        <div className="forensic-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
            2. CTI Evidence Ingestion Mode
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setIngestMode('synthetic')}
              className={`p-4 rounded-md border text-left transition-all ${
                ingestMode === 'synthetic'
                  ? 'border-blue-600 bg-blue-50/60 shadow-subtle'
                  : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <Database className="w-5 h-5 text-blue-600 mb-2" />
              <div className="font-semibold text-xs text-slate-900">Synthetic Benchmark</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Load curated research dataset with conflicting RCE claims and attribution disputes.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIngestMode('paste')}
              className={`p-4 rounded-md border text-left transition-all ${
                ingestMode === 'paste'
                  ? 'border-blue-600 bg-blue-50/60 shadow-subtle'
                  : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <FileText className="w-5 h-5 text-blue-600 mb-2" />
              <div className="font-semibold text-xs text-slate-900">Paste Threat Text</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Paste raw CTI bulletins, advisories, or forum posts for normalization and extraction.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIngestMode('upload')}
              className={`p-4 rounded-md border text-left transition-all ${
                ingestMode === 'upload'
                  ? 'border-blue-600 bg-blue-50/60 shadow-subtle'
                  : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <Upload className="w-5 h-5 text-blue-600 mb-2" />
              <div className="font-semibold text-xs text-slate-900">Upload Text / JSON</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Import local intelligence report files or STIX/JSON formatted bundles.
              </p>
            </button>
          </div>

          {ingestMode === 'synthetic' && (
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1 font-mono">
              <div className="font-semibold text-slate-900">Preset Scenarios Included:</div>
              <div>• Scenario A: Disputed Zero-Day RCE Attribution (CVE-2026-SYNTH-8901)</div>
              <div>• Scenario B: Ransomware Exfiltration Double-Claim (GhostWeaver vs DarkHydra)</div>
              <div>• Scenario C: OT/ICS PLC Buffer Overflow & PoC Timeline (CVE-2026-SYNTH-4412)</div>
            </div>
          )}

          {ingestMode === 'paste' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Raw CTI Content *
              </label>
              <textarea
                rows={6}
                required={ingestMode === 'paste'}
                value={pastedCti}
                onChange={(e) => setPastedCti(e.target.value)}
                placeholder="Paste threat intelligence excerpt mentioning CVEs, threat actors, malware, IOCs, timestamps..."
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 transition-colors"
              />
            </div>
          )}

          {ingestMode === 'upload' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Select File (.txt, .json, .csv)
              </label>
              <input
                type="file"
                accept=".txt,.json,.csv"
                onChange={handleFileUpload}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white"
              />
              {pastedCti && (
                <div className="mt-2 text-xs font-mono text-emerald-600">
                  File loaded: {pastedCti.length} characters ready for extraction.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: AI Configuration */}
        <div className="forensic-card p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase font-mono">
                Google Gemini AI Semantic Co-Pilot
              </div>
              <p className="text-[11px] text-slate-500">
                Augments deterministic parsers with deep contradiction reasoning. Deterministic fallback active if unavailable.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useGemini}
              onChange={(e) => setUseGemini(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-6 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing 12-Stage Forensic Pipeline...</span>
            </>
          ) : (
            <>
              <span>Launch Temporal Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
