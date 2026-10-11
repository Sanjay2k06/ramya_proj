import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('analyst_demo');
    setPassword('TemporalForensics2026!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 shadow-subtle">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-slate-900 mx-auto flex items-center justify-center text-white mb-3 shadow-sm">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            Analyst Authentication
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            TEMPORAL CTI FORENSICS SECURE ACCESS
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
              Analyst Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst_demo"
                className="w-full text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:bg-white text-slate-900 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Fill Helper Button */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDemoFill}
            className="w-full py-2 px-3 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors font-mono"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Demo Credentials (analyst_demo)</span>
          </button>

          <div className="text-center mt-4 text-xs text-slate-500">
            Need an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Register analyst profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
