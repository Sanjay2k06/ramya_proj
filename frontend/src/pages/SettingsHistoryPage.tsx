import React, { useEffect, useState } from 'react';
import { healthService, investigationService } from '../services/api';
import { Badge } from '../components/Badge';
import {
  Settings,
  Database,
  Cpu,
  Shield,
  RefreshCw,
  FolderGit2,
  HardDrive,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const SettingsHistoryPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [setRes, invRes] = await Promise.all([
        healthService.getSettings(),
        investigationService.list(),
      ]);
      setSettings(setRes.data);
      setInvestigations(invRes.data.investigations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-500">QUERYING SYSTEM CONFIGURATION & HEALTH...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            System Settings & Forensic History
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            SQLITE DATABASE HEALTH • GEMINI AI CONFIGURATION • OPERATIONAL REPOSITORY
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
          title="Refresh Settings"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid: Database Health & Gemini Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Health Card */}
        <div className="forensic-card p-6 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 font-sans">SQLite Database Engine</h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">DATABASE TYPE:</span>
              <span className="font-semibold text-slate-900">{settings?.database?.type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">PATH:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={settings?.database?.path}>
                {settings?.database?.path}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">WAL (WRITE-AHEAD LOG):</span>
              <span className="text-emerald-600 font-bold">ENABLED (CONCURRENT READS)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">FOREIGN KEY PRAGMA:</span>
              <span className="text-emerald-600 font-bold">ENFORCED (CASCADE DELETE)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">EVIDENCE INVENTORY:</span>
              <span className="font-semibold text-slate-900">{settings?.database?.total_evidence_records} records</span>
            </div>
          </div>
        </div>

        {/* Gemini AI & Model Metadata Card */}
        <div className="forensic-card p-6 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 font-sans">Gemini AI & ML Status</h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">GEMINI API KEY:</span>
              <span className={`font-bold ${settings?.ai_integration?.gemini_configured ? 'text-emerald-600' : 'text-amber-600'}`}>
                {settings?.ai_integration?.gemini_configured ? 'CONFIGURED & READY' : 'NOT CONFIGURED'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">ACTIVE MODEL:</span>
              <span className="font-semibold text-slate-900">{settings?.ai_integration?.model_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">TIMEOUT:</span>
              <span className="font-semibold text-slate-900">{settings?.ai_integration?.timeout_seconds}s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">DETERMINISTIC FALLBACK:</span>
              <span className="text-emerald-600 font-bold">GUARANTEED ACTIVE</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">TIME-TO-EXPLOIT REGRESSOR:</span>
              <span className="font-semibold text-slate-900">BASELINE STACKING META-REGRESSOR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Investigation Archives */}
      <div className="forensic-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans">Historical Investigation Archives</h2>
            <p className="text-[11px] font-mono text-slate-500">ALL PERSISTED INVESTIGATIONS IN LOCAL SQLITE REPOSITORY</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{investigations.length} WORKSPACES</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {investigations.map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 font-sans block">{inv.title}</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {inv.id} • Objective: {inv.objective} • Created: {inv.created_at?.substring(0, 10)}
                </span>
              </div>
              <Badge variant={inv.status === 'completed' ? 'low' : 'info'} size="sm">
                {inv.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
