import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Sparkles, User as UserIcon, LogOut, Bell, Shield } from 'lucide-react';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
      {/* Left: Active title & Breadcrumb */}
      <div className="flex items-center space-x-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900 leading-tight">
            {title || 'Temporal CTI Forensics Platform'}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            EVIDENCE CHAINING & CONFLICT DETECTION
          </span>
        </div>
      </div>

      {/* Middle: Forensic Global Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center w-72 relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search CVE, IP, malware, actor..."
          className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white transition-colors placeholder:text-slate-400 font-mono"
        />
      </form>

      {/* Right: AI Status, Notifications & User */}
      <div className="flex items-center space-x-4">
        {/* Gemini AI Status Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>GEMINI 1.5 FLASH (ACTIVE)</span>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Audit Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-900 leading-none">
                {user?.username || 'Analyst'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {user?.role || 'Senior Analyst'}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-premium py-1 z-30">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-900 truncate">{user?.username}</p>
                <p className="text-[11px] text-slate-500 truncate font-mono">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <UserIcon className="w-3.5 h-3.5 mr-2" /> System Settings
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left flex items-center px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
