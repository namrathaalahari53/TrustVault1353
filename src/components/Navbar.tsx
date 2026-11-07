/**
 * TrustVault - Top Navigation & Role Switcher Bar
 */

import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext.tsx';
import {
  Shield,
  FileText,
  Activity,
  Users,
  Lock,
  LogOut,
  UserCheck,
  ChevronDown,
  CheckCircle2,
  Bug,
  Key,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenUpload }) => {
  const { user, logout, switchDemoUser } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  if (!user) return null;

  const roleColor =
    user.role === 'Administrator'
      ? 'bg-purple-950 text-purple-300 border-purple-700/50'
      : user.role === 'Owner'
      ? 'bg-blue-950 text-blue-300 border-blue-700/50'
      : 'bg-emerald-950 text-emerald-300 border-emerald-700/50';

  return (
    <header className="sticky top-0 z-40 bg-[#0B132B] border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Trust<span className="text-blue-400">Vault</span></span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  CONFIDENTIAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5">Secure Document Sharing & Cryptographic Audit</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('documents')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'documents'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </button>

            <button
              onClick={() => setCurrentTab('audit')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'audit'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Tamper-Evident Audit</span>
            </button>

            <button
              onClick={() => setCurrentTab('tests')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'tests'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>18 Security Tests</span>
            </button>

            <button
              onClick={() => setCurrentTab('idor')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                currentTab === 'idor'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bug className="w-4 h-4 text-amber-400" />
              <span>IDOR Probe Lab</span>
            </button>

            {user.role === 'Administrator' && (
              <button
                onClick={() => setCurrentTab('users')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  currentTab === 'users'
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </button>
            )}
          </nav>

          {/* Right Action Bar: Fast Role Switcher & Profile */}
          <div className="flex items-center space-x-3">
            {/* Quick Upload Button (Owner or Admin) */}
            {(user.role === 'Owner' || user.role === 'Administrator') && (
              <button
                onClick={onOpenUpload}
                className="hidden sm:inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>+ Upload Vault Doc</span>
              </button>
            )}

            {/* Fast Role Switcher Dropdown (Crucial for Reviewers/Hiring Evaluators) */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 text-xs text-slate-200 transition-colors"
                title="Switch persona to evaluate role permissions"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium hidden sm:inline">Role Switcher:</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleColor}`}>
                  {user.role}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setRoleMenuOpen(false)}
                >
                  <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                    <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Test Role Personas</p>
                    <p className="text-[10px] text-slate-400">Instantly switch accounts to verify authorization policies</p>
                  </div>

                  {(Object.keys(DEMO_ACCOUNTS) as Array<keyof typeof DEMO_ACCOUNTS>).map((key) => {
                    const acc = DEMO_ACCOUNTS[key];
                    const isCurrent = user.email.toLowerCase() === acc.email.toLowerCase();
                    return (
                      <button
                        key={key}
                        onClick={async () => {
                          setRoleMenuOpen(false);
                          await switchDemoUser(key);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-colors flex flex-col space-y-0.5 mb-1 ${
                          isCurrent
                            ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center space-x-1.5">
                            <span>{acc.label}</span>
                            {isCurrent && <span className="text-[10px] text-blue-400 font-bold">(Active)</span>}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-400">
                            {acc.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate">{acc.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profile & Logout Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              </button>

              {profileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50"
                  onMouseLeave={() => setProfileMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setCurrentTab('profile');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center space-x-2 mt-1"
                  >
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <span>Profile & Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg flex items-center space-x-2 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
