/**
 * TrustVault - IDOR & Security Probe Interactive Lab
 * Interactive penetration testing sandbox showing why client-side tampering,
 * guessing document IDs, or forged requests fail with strict 403 Forbidden.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredToken } from '../services/api.ts';
import {
  Bug,
  ShieldAlert,
  ShieldCheck,
  Send,
  Terminal,
  Lock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const IdorDemoView: React.FC = () => {
  const { user } = useAuth();
  const [targetDocId, setTargetDocId] = useState('doc_unauthorized_target_9999');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('preview');
  const [loading, setLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<{
    status: number;
    statusText: string;
    body: any;
    headers: Record<string, string>;
    auditRecorded: boolean;
  } | null>(null);

  const handleExecuteProbe = async () => {
    setLoading(true);
    setResponseLog(null);

    const token = getStoredToken();
    const endpointUrl =
      selectedEndpoint === 'preview'
        ? `/api/documents/${encodeURIComponent(targetDocId)}/preview`
        : selectedEndpoint === 'download'
        ? `/api/documents/${encodeURIComponent(targetDocId)}/download`
        : selectedEndpoint === 'edit'
        ? `/api/documents/${encodeURIComponent(targetDocId)}`
        : `/api/documents/${encodeURIComponent(targetDocId)}`;

    const method =
      selectedEndpoint === 'edit'
        ? 'PATCH'
        : selectedEndpoint === 'delete'
        ? 'DELETE'
        : 'GET';

    try {
      const res = await fetch(endpointUrl, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: selectedEndpoint === 'edit' ? JSON.stringify({ name: 'HACKED_DOCUMENT' }) : undefined,
      });

      let bodyData: any;
      try {
        bodyData = await res.json();
      } catch {
        bodyData = await res.text();
      }

      setResponseLog({
        status: res.status,
        statusText: res.statusText,
        body: bodyData,
        headers: {
          'content-type': res.headers.get('content-type') || 'application/json',
          'x-frame-options': res.headers.get('x-frame-options') || 'SAMEORIGIN',
        },
        auditRecorded: res.status === 403 || res.status === 404,
      });
    } catch (err: unknown) {
      setResponseLog({
        status: 0,
        statusText: 'Network / Client Failure',
        body: { error: err instanceof Error ? err.message : String(err) },
        headers: {},
        auditRecorded: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
            <Bug className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-white text-lg">IDOR & Server Authorization Lab</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                TEST ENVIRONMENT
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Verify that TrustVault prevents Insecure Direct Object References (IDOR). Enter any arbitrary document ID,
              foreign user's document ID, or simulated attack payload. The centralized authorization service checks the
              live database on every request and logs attempts as <code className="text-amber-300">UNAUTHORIZED_ACCESS_ATTEMPT</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Probe Form */}
      <div className="bg-[#1C2541]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-sm">Simulate Parameter Tampering / ID Probing</h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Document ID to Probe</label>
            <input
              type="text"
              value={targetDocId}
              onChange={(e) => setTargetDocId(e.target.value)}
              placeholder="e.g. doc_12345 or foreign UUID"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Probe Action</label>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="preview">GET /preview (Unauthorized Preview)</option>
              <option value="download">GET /download (Unauthorized Download)</option>
              <option value="edit">PATCH /documents/:id (Unauthorized Edit)</option>
              <option value="delete">DELETE /documents/:id (Unauthorized Deletion)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              onClick={handleExecuteProbe}
              disabled={loading || !targetDocId}
              className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Transmitting Probe...' : 'Execute Direct API Probe'}</span>
            </button>
          </div>
        </div>

        {/* Live Response Panel */}
        {responseLog && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span>Backend Server Response</span>
              </span>

              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded border ${
                  responseLog.status === 403
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : responseLog.status === 404
                    ? 'bg-blue-950 text-blue-300 border-blue-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}
              >
                HTTP {responseLog.status} {responseLog.statusText}
              </span>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
              <p className="text-slate-500 text-[11px]">// Authenticated User: {user?.email} (Role: {user?.role})</p>
              <p className="text-slate-500 text-[11px]">// Request Method: {selectedEndpoint === 'edit' ? 'PATCH' : selectedEndpoint === 'delete' ? 'DELETE' : 'GET'}</p>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 text-cyan-300">
                {JSON.stringify(responseLog.body, null, 2)}
              </div>
            </div>

            {responseLog.status === 403 && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>IDOR Attack Mitigated Successfully!</strong> The server evaluated your identity, verified that
                  you do not own this document and have no active permission, and returned HTTP 403 Forbidden. An immutable audit
                  entry was recorded.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
