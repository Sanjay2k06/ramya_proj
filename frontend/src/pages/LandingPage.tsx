import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Clock,
  Network,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Lock,
  Database,
  FileCheck2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loginAsDemoAnalyst } = useAuth();

  const handleStartInvestigation = () => {
    if (isAuthenticated) {
      navigate('/investigations/new');
    } else {
      navigate('/login');
    }
  };

  const handleExploreSample = async () => {
    if (!isAuthenticated) {
      try {
        await loginAsDemoAnalyst();
      } catch {}
    }
    navigate('/investigations/inv-sample-synth-01');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white font-bold font-mono text-sm">
            TF
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900 uppercase">
              TEMPORAL CTI FORENSICS
            </span>
            <span className="text-[11px] block font-mono text-slate-500">
              ACADEMIC RESEARCH & ENTERPRISE INTEL PLATFORM
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Open Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-8 py-20 max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono mb-6 mx-auto">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>TEMPORAL GRAPH-BASED FORENSIC CORRELATION ENGINE</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6 font-sans">
          Fake Cyber Threat Intelligence Detection & Explainable Evidence Chaining
        </h1>

        <p className="text-base md:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed mb-10">
          Unverified threat claims and conflicting CTI bulletins misdirect defensive operations. 
          Temporal CTI Forensics ingests disparate threat feeds, extracts verifiable claims, 
          detects temporal and attribution contradictions, constructs knowledge graphs, 
          and produces transparent, explainable recommendations for defensive prioritization.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={handleStartInvestigation}
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <span>Start Investigation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleExploreSample}
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-semibold text-sm flex items-center justify-center space-x-2 shadow-subtle transition-all"
          >
            <Database className="w-4 h-4 text-slate-500" />
            <span>Explore Seeded Sample Analysis</span>
          </button>
        </div>

        {/* 4 Core Architectural Foundations (Inspired by Research Papers) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          <div className="forensic-card p-5">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Knowledge Graph Synthesis</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Constructs NetworkX directed knowledge graphs connecting CVEs, threat actors, malware families, and network infrastructure.
            </p>
          </div>

          <div className="forensic-card p-5">
            <div className="w-9 h-9 rounded-md bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Contradiction Detection</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detects attribution conflicts, affected version discrepancies, and incompatible observation timestamps across sources.
            </p>
          </div>

          <div className="forensic-card p-5">
            <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Explainable Risk Scoring</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mathematically transparent priority formulas decomposing severity, corroboration, recency, and exploit feasibility.
            </p>
          </div>

          <div className="forensic-card p-5">
            <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-4">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Auditable Evidence Chains</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every defensive recommendation is traceable to source publications with persistent cryptographic provenance.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-8 py-6 text-center text-xs text-slate-500 font-mono">
        TEMPORAL CTI FORENSICS — CYBERSECURITY RESEARCH PLATFORM • POWERED BY FLASK, SQLITE3, NETWORKX & GEMINI AI
      </footer>
    </div>
  );
};
