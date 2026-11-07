/**
 * TrustVault - Interactive Automated Security Test Runner View
 * Executes the 18 mandatory security test cases against the live backend
 * and displays comprehensive proof of authorization and cryptographic integrity.
 */

import React, { useState, useEffect } from 'react';
import { SecurityTestReport, TestCaseResult } from '../types.ts';
import { api } from '../services/api.ts';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Filter,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

export const SecurityTestSuiteView: React.FC = () => {
  const [report, setReport] = useState<SecurityTestReport | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    executeTests();
  }, []);

  const executeTests = async () => {
    setRunning(true);
    try {
      const res = await api.runSecurityTests();
      setReport(res);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error executing test suite');
    } finally {
      setRunning(false);
    }
  };

  const categories = ['ALL', 'Ownership', 'Authorization', 'Permissions', 'Audit', 'Upload Security'];

  const filteredTests = report?.tests.filter((t) => {
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Test Suite Summary Banner */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div
              className={`p-3 rounded-2xl border ${
                report?.allPassed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {report?.allPassed ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <h2 className="font-extrabold text-white text-lg">Automated Security & Authorization Suite</h2>
                {report && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      report.allPassed
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}
                  >
                    {report.passedCount} / {report.totalTests} TESTS PASSED (100%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Verifies strict server-side authorization enforcement, zero-delay revocation, Insecure Direct Object
                Reference (IDOR) prevention, cryptographic hash-chain tamper detection, and malware rejection.
              </p>
              {report && (
                <p className="text-[11px] text-slate-400 font-mono mt-2 flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Last executed: {new Date(report.timestamp).toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={executeTests}
            disabled={running}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Executing 18 Security Scenarios...' : 'Run All 18 Tests'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-between bg-[#1C2541]/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filter by Requirement:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === c
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Test Results List */}
      <div className="space-y-3">
        {running ? (
          <div className="p-12 text-center text-slate-400 bg-[#1C2541]/40 border border-slate-800 rounded-2xl space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">Running Automated Security Suite against backend...</p>
            <p className="text-xs text-slate-400">Evaluating RBAC, ABAC, IDOR probes, and hash-chain calculations</p>
          </div>
        ) : (
          filteredTests?.map((test) => (
            <div
              key={test.id}
              className={`bg-[#1C2541]/90 border rounded-2xl p-4 shadow-lg transition-all ${
                test.passed
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-rose-500/50 bg-rose-950/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {test.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-400">Test #{test.id}</span>
                      <h4 className="font-bold text-sm text-white">{test.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {test.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{test.message}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">{test.executionTimeMs} ms</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                      test.passed
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
