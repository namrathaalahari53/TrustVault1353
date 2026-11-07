/**
 * TrustVault - Enterprise Security Dashboard View
 * Features real-time KPIs, cryptographic integrity indicator, recent activity stream,
 * category distribution, and role-tailored security overviews.
 */

import React, { useState, useEffect } from 'react';
import { SystemStats, DocumentItem, AuditLog } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  FileText,
  Share2,
  Lock,
  Activity,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Folder,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenPreview: (doc: DocumentItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenUpload,
  onOpenPreview,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, docsRes, logsRes] = await Promise.all([
        api.getStats(),
        api.getDocuments(),
        api.getAuditLogs(),
      ]);
      setStats(statsRes);
      setRecentDocs(docsRes.documents.slice(0, 5));
      setRecentLogs(logsRes.logs.slice(0, 6));
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-blue-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                TRUSTVAULT SECURITY PORTAL
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">
                {user?.role} Access
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Welcome, {user?.full_name}</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              All documents are isolated in private vault storage with server-side authorization enforcement and a
              tamper-evident SHA-256 cryptographic audit chain.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {(user?.role === 'Owner' || user?.role === 'Administrator') && (
              <button
                onClick={onOpenUpload}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition-all hover:scale-[1.02]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('tests')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verify 18 Tests</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div
          onClick={() => onNavigateTab('documents')}
          className="bg-[#1C2541]/80 hover:bg-[#1C2541] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Accessible Documents</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{stats?.totalDocs ?? '—'}</p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
            <span>My Uploads: {stats?.myDocs ?? 0}</span>
            <span>Shared: {stats?.sharedDocs ?? 0}</span>
          </div>
        </div>

        {/* Cryptographic Integrity */}
        <div
          onClick={() => onNavigateTab('audit')}
          className="bg-[#1C2541]/80 hover:bg-[#1C2541] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Audit Trail Integrity</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">
            {stats?.integrityValid ? '100% INTACT' : 'COMPROMISED'}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-mono">
            <span>{stats?.totalAuditRecords ?? 0} Linked Blocks</span>
            <span className="text-emerald-400">SHA-256 Valid</span>
          </div>
        </div>

        {/* Security Events */}
        <div
          onClick={() => onNavigateTab('audit')}
          className="bg-[#1C2541]/80 hover:bg-[#1C2541] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Security Access Denials</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-2">{stats?.securityEvents ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-2">IDOR & unauthorized attempts intercepted</p>
        </div>

        {/* Total Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-[#1C2541]/80 hover:bg-[#1C2541] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Provisioned Identities</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">{stats?.totalUsers ?? '—'}</p>
          <p className="text-[11px] text-slate-400 mt-2">Strict RBAC & ABAC governance</p>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Real-Time Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vault Documents */}
        <div className="bg-[#1C2541]/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Authorized Documents</span>
              </h3>
              <button
                onClick={() => onNavigateTab('documents')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading vault documents...</p>
            ) : recentDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No documents accessible.</div>
            ) : (
              <div className="space-y-2.5">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenPreview(doc)}
                    className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                        {doc.file_extension}
                      </span>
                      <div>
                        <h4 className="font-semibold text-xs text-white line-clamp-1">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          {doc.category} • By {doc.owner_name}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        doc.user_permission === 'Owner'
                          ? 'bg-blue-950 text-blue-300'
                          : doc.user_permission === 'Editor'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-emerald-950 text-emerald-300'
                      }`}
                    >
                      {doc.user_permission}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-[#1C2541]/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Tamper-Evident Audit Activity</span>
              </h3>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                <span>View Chain</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading audit events...</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          log.success === 1 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-300 text-[11px] truncate max-w-[140px]">
                        {log.user_email || 'System'}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
