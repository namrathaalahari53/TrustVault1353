/**
 * TrustVault - Cryptographic Tamper-Evident Audit Trail View
 * Features:
 * - Real-time audit log stream (successes, denials, IDOR probes, logins, permission events)
 * - Cryptographic hash chain inspector (SHA-256 links)
 * - Live "Verify Integrity" calculation button
 * - Live Tamper Simulation test trigger (Test #15)
 */

import React, { useState, useEffect } from 'react';
import { AuditLog, IntegrityReport } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldAlert,
  Hash,
  Clock,
  User,
  ShieldCheck,
  Bug,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [tamperTesting, setTamperTesting] = useState(false);
  const [tamperResult, setTamperResult] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [logsRes, integrityRes] = await Promise.all([
        api.getAuditLogs(),
        api.verifyAuditIntegrity(),
      ]);
      setLogs(logsRes.logs);
      setIntegrity(integrityRes);
    } catch (err: unknown) {
      console.error('Error loading audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    setTamperResult(null);
    try {
      const res = await api.verifyAuditIntegrity();
      setIntegrity(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamperTest = async () => {
    setTamperTesting(true);
    try {
      const res = await api.simulateTamperTest();
      setTamperResult(
        `Tamper Test Succeeded: Altered test record was detected immediately by the cryptographic verifier (${res.tamperDetectionDetail}). Chain has now been restored to valid state.`
      );
      await loadLogs();
    } catch (err: unknown) {
      setTamperResult(`Simulation error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTamperTesting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEmail = log.user_email?.toLowerCase().includes(q);
      const matchReason = log.reason?.toLowerCase().includes(q);
      const matchDoc = log.document_id?.toLowerCase().includes(q);
      if (!matchAction && !matchEmail && !matchReason && !matchDoc) return false;
    }
    return true;
  });

  const getActionBadgeClass = (action: string, success: number) => {
    if (success === 0 || action.includes('UNAUTHORIZED') || action.includes('REJECTED')) {
      return 'bg-rose-950 text-rose-300 border-rose-700/60';
    }
    if (action.includes('PERMISSION')) {
      return 'bg-amber-950 text-amber-300 border-amber-700/60';
    }
    if (action.includes('UPLOAD') || action.includes('DOWNLOAD')) {
      return 'bg-blue-950 text-blue-300 border-blue-700/60';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Integrity Verification Card */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-blue-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div
              className={`p-3 rounded-2xl border ${
                integrity?.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {integrity?.valid ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-white text-lg">Cryptographic Audit Chain Integrity</h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    integrity?.valid
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {integrity?.valid ? 'CHAIN VERIFIED INTACT (100%)' : 'CHAIN COMPROMISED'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Every audit entry is mathematically linked via SHA-256 hash chaining:{' '}
                <code className="text-cyan-300 text-[11px] bg-slate-900 px-1 py-0.5 rounded">
                  SHA256(prev_hash + payload)
                </code>
                . If any row is edited, deleted, or inserted out of order, the verification engine detects the break
                immediately.
              </p>
              {integrity && (
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400 font-mono">
                  <span>Verified Records: <strong className="text-white">{integrity.totalRecords}</strong></span>
                  <span>Latest Hash: <strong className="text-cyan-300">{integrity.latestHash.substring(0, 16)}...</strong></span>
                  <span>Checked: {new Date(integrity.verifiedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2">
            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Verifying Math...' : 'Re-verify Chain'}</span>
            </button>

            {user?.role === 'Administrator' && (
              <button
                onClick={handleSimulateTamperTest}
                disabled={tamperTesting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
                title="Runs an automated test that simulates record tampering and verifies the detector catches it"
              >
                <Bug className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Tamper Test</span>
              </button>
            )}
          </div>
        </div>

        {tamperResult && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start space-x-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{tamperResult}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1C2541]/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, user email, document ID, or reason..."
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="UNAUTHORIZED_ACCESS_ATTEMPT">UNAUTHORIZED_ACCESS_ATTEMPT</option>
            <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
            <option value="DOCUMENT_PREVIEW">DOCUMENT_PREVIEW</option>
            <option value="DOCUMENT_DOWNLOAD">DOCUMENT_DOWNLOAD</option>
            <option value="DOCUMENT_EDIT">DOCUMENT_EDIT</option>
            <option value="DOCUMENT_DELETE">DOCUMENT_DELETE</option>
            <option value="PERMISSION_GRANTED">PERMISSION_GRANTED</option>
            <option value="PERMISSION_REVOKED">PERMISSION_REVOKED</option>
          </select>

          <button
            onClick={loadLogs}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#1C2541]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Immutable Audit Stream ({filteredLogs.length} events)</h3>
          <span className="text-[11px] text-slate-400">Chronological append-only storage</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading tamper-evident audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No audit records match the current filters.</div>
        ) : (
          <div className="divide-y divide-slate-800/80 overflow-x-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-900/50 transition-colors flex flex-col space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${getActionBadgeClass(
                        log.action,
                        log.success
                      )}`}
                    >
                      {log.action}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        log.success === 1 ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                      }`}
                    >
                      {log.success === 1 ? 'SUCCESS' : 'DENIED / FAILED'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {log.user_email || 'Unauthenticated / System'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(log.timestamp).toLocaleString()} UTC</span>
                    </span>
                    <span>IP: {log.ip_address || '127.0.0.1'}</span>
                  </div>
                </div>

                {log.reason && (
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <strong className="text-slate-400">Reason / Context:</strong> {log.reason}
                  </p>
                )}

                {/* Cryptographic Hash Links */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-slate-600" />
                    <span>Prev: <code className="text-slate-400">{log.prev_hash.substring(0, 12)}...</code></span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-700" />
                  <span className="flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-cyan-500/70" />
                    <span>Hash: <code className="text-cyan-400">{log.current_hash.substring(0, 16)}...</code></span>
                  </span>
                  {log.document_id && (
                    <span className="text-slate-400 ml-auto">
                      Doc Target: <code className="text-blue-300">{log.document_id}</code>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
