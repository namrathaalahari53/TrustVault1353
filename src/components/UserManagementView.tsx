/**
 * TrustVault - User Administration & Governance View (Admin Only)
 * Allows creating accounts, role reassignment, and account suspension/activation.
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New user form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'Administrator' | 'Owner' | 'ViewerEditor'>('ViewerEditor');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.createUser({ email, password, full_name: fullName, role });
      setShowCreateModal(false);
      setEmail('');
      setPassword('');
      setFullName('');
      await loadUsers();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('Administrators cannot deactivate their own active session.');
      return;
    }

    try {
      await api.toggleUserStatus(user.id, !user.is_active);
      await loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update account status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      await loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#1C2541]/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-extrabold text-white text-lg">User Administration & Governance</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Enterprise RBAC management. Grant administrative oversight, document ownership, or viewer rights.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center space-x-2 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#1C2541]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Provisioned Accounts ({users.length})</h3>
          <button
            onClick={loadUsers}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading user roster...</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                      {u.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white">{u.full_name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-bold">
                            Current Session
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            u.is_active ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="Owner">Owner</option>
                      <option value="ViewerEditor">ViewerEditor</option>
                    </select>

                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={isSelf}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        u.is_active
                          ? 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                      } disabled:opacity-40`}
                    >
                      {u.is_active ? 'Suspend Account' : 'Activate Account'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Provision New User Account</h3>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rachel@trustvault.internal"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters (bcrypt hashed)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ViewerEditor">ViewerEditor (Restricted to granted documents)</option>
                  <option value="Owner">Owner (Can upload & manage confidential vaults)</option>
                  <option value="Administrator">Administrator (Global oversight & audits)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow"
                >
                  {createLoading ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
