import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileSearch,
  Clock,
  Network,
  AlertTriangle,
  ShieldAlert,
  Flame,
  BrainCircuit,
  ShieldCheck,
  FileText,
  Settings,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  Beaker,
  Search,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { id } = useParams<{ id?: string }>();
  // Default to sample investigation if no route param is currently selected
  const activeInvId = id || 'inv-sample-synth-01';

  const navItems = [
    { label: 'Analyst Dashboard', icon: LayoutDashboard, path: '/dashboard', section: 'core' },
    { label: 'New Investigation', icon: PlusCircle, path: '/investigations/new', section: 'core' },
    { label: 'Workspace Search', icon: Search, path: '/search', section: 'core' },
    { label: 'Investigation Dossier', icon: FolderGit2, path: `/investigations/${activeInvId}`, section: 'investigation' },
    { label: 'Evidence Explorer', icon: FileSearch, path: `/investigations/${activeInvId}/evidence`, section: 'investigation' },
    { label: 'Temporal Timeline', icon: Clock, path: `/investigations/${activeInvId}/timeline`, section: 'investigation' },
    { label: 'Knowledge Graph', icon: Network, path: `/investigations/${activeInvId}/graph`, section: 'investigation' },
    { label: 'Conflict Analysis', icon: AlertTriangle, path: `/investigations/${activeInvId}/conflicts`, section: 'forensics' },
    { label: 'Risk Assessment', icon: ShieldAlert, path: `/investigations/${activeInvId}/risk`, section: 'forensics' },
    { label: 'Time-to-Exploit (ML)', icon: Flame, path: `/investigations/${activeInvId}/time-to-exploit`, section: 'forensics' },
    { label: 'Explainable Reasoning', icon: BrainCircuit, path: `/investigations/${activeInvId}/reasoning`, section: 'forensics' },
    { label: 'Defensive Actions', icon: ShieldCheck, path: `/investigations/${activeInvId}/recommendations`, section: 'actions' },
    { label: 'Forensic Report', icon: FileText, path: `/investigations/${activeInvId}/report`, section: 'actions' },
    { label: 'Research Lab (Benchmark)', icon: Beaker, path: '/evaluation', section: 'system' },
    { label: 'Settings & Status', icon: Settings, path: '/settings', section: 'system' },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      } shrink-0 z-20`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-bold font-mono">
              TF
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 font-sans uppercase">
              CTI Forensics
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-bold font-mono">
            TF
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center' : 'space-x-3'}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500">
          <div className="flex items-center justify-between">
            <span>ENGINE: v1.0-STABLE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        </div>
      )}
    </aside>
  );
};
