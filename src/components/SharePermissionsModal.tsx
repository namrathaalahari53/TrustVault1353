/**
 * TrustVault - Document Permissions & Sharing Management Modal
 * Allows document owners to grant Reader/Editor permissions and execute instant revocation.
 */

import React, { useState, useEffect } from 'react';
import { DocumentItem, DocumentPermission, User } from '../types.ts';
import { api } from '../services/api.ts';
import {
  Share2,
  X,
  UserPlus,
  ShieldCheck,
  Trash2,
  Clock,
  AlertTriangle,
  UserX,
  CheckCircle2,
} from 'lucide-react';

interface SharePermissionsModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated: () => void;
}

export const SharePermissionsModal: React.FC<SharePermissionsModalProps> = ({
  document,
  isOpen,
  onClose,
  onPermissionsUpdated,
}) => {
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'Reader' | 'Editor'>('Reader');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      loadData();
    }
  }, [isOpen, document]);

  const loadData = async () => {
    if (!document) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [permsRes, usersRes] = await Promise.all([
        api.getPermissions(document.id),
        api.getUsers(),
      ]);
      setPermissions(permsRes.permissions);
      // Filter out the document owner from user selection
      setUsers(usersRes.users.filter((u) => u.id !== document.owner_id));
      if (usersRes.users.length > 0) {
        const eligible = usersRes.users.find((u) => u.id !== document.owner_id);
        if (eligible) setSelectedUserId(eligible.id);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !selectedUserId) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.grantPermission(document.id, selectedUserId, permissionLevel);
      setSuccessMessage(`Granted ${permissionLevel} permission successfully.`);
      await loadData();
      onPermissionsUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error granting permission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (permissionId: string) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.revokePermission(permissionId);
      setSuccessMessage('Permission revoked immediately. Access has been terminated.');
      await loadData();
      onPermissionsUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error revoking permission');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !document) return null;

  const activePermissions = permissions.filter((p) => p.revoked_at === null);
  const revokedPermissions = permissions.filter((p) => p.revoked_at !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1C2541] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-[#0B132B]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Document Access Permissions</h2>
              <p className="text-xs text-slate-400 truncate max-w-md">{document.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Grant New Permission Section */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/70 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-blue-400" />
              <span>Grant New Document Access</span>
            </h3>

            <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Permission Level</label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as 'Reader' | 'Editor')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Reader">Reader (View/Download)</option>
                  <option value="Editor">Editor (Edit Details)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={submitting || !selectedUserId}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center justify-center space-x-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Grant Access</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Authorizations */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Active Authorizations ({activePermissions.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Immediate enforcement via ABAC</span>
            </h3>

            {loading ? (
              <p className="text-xs text-slate-400">Loading access records...</p>
            ) : activePermissions.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                No active external permissions granted. Only the document owner has access.
              </div>
            ) : (
              <div className="space-y-2">
                {activePermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {perm.grantee_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-white">{perm.grantee_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              perm.permission_level === 'Editor'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                                : 'bg-blue-950 text-blue-300 border border-blue-700/50'
                            }`}
                          >
                            {perm.permission_level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{perm.grantee_email}</p>
                        <p className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Granted {new Date(perm.granted_at).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevoke(perm.id)}
                      disabled={submitting}
                      className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                      title="Immediately revoke document permission"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revoked Permission History */}
          {revokedPermissions.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Revocation History ({revokedPermissions.length})
              </h3>
              <div className="space-y-1.5 opacity-70">
                {revokedPermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-2.5 bg-slate-900/30 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-slate-300">{perm.grantee_name}</span>{' '}
                      <span className="text-slate-500">({perm.grantee_email})</span>
                      <span className="ml-2 text-[10px] text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                        Revoked
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Revoked on {perm.revoked_at ? new Date(perm.revoked_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700/60 bg-[#0B132B] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
