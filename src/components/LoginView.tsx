/**
 * TrustVault - Enterprise Authentication & Persona Selection Portal
 */

import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext.tsx';
import {
  Shield,
  Lock,
  Mail,
  Key,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@trustvault.internal');
  const [password, setPassword] = useState('Owner@TrustVault2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (key: keyof typeof DEMO_ACCOUNTS) => {
    const creds = DEMO_ACCOUNTS[key];
    setEmail(creds.email);
    setPassword(creds.password);
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 border border-blue-400/30">
          <Shield className="w-9 h-9 text-white" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-white tracking-tight">
          Trust<span className="text-blue-400">Vault</span>
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Secure Document Sharing Platform with Tamper-Evident Audit Trail
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* Login Box */}
        <div className="bg-[#1C2541] border border-slate-700/80 rounded-2xl p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.01]"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Secure Vault'}</span>
            </button>
          </form>
        </div>

        {/* 1-Click Fast Persona Switcher for Evaluation */}
        <div className="bg-[#1C2541]/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Evaluation Personas (Click to autofill)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as Array<keyof typeof DEMO_ACCOUNTS>).map((key) => {
              const acc = DEMO_ACCOUNTS[key];
              const isSelected = email.toLowerCase() === acc.email.toLowerCase();
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectDemo(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/50 text-white shadow'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold">{acc.badge}</span>
                  <span className="text-[10px] text-slate-400 truncate">{acc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
