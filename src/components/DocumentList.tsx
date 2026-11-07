/**
 * TrustVault - Document Management & Repository View
 * Features category filtering, full-text search, role-based action buttons,
 * inline metadata editing, and secure preview/download triggers.
 */

import React, { useState } from 'react';
import { DocumentItem } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  Share2,
  Trash2,
  Edit3,
  Lock,
  ShieldCheck,
  Calendar,
  User,
  HardDrive,
  Hash,
  AlertTriangle,
} from 'lucide-react';

interface DocumentListProps {
  documents: DocumentItem[];
  loading: boolean;
  onRefresh: () => void;
  onOpenPreview: (doc: DocumentItem) => void;
  onOpenShare: (doc: DocumentItem) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading,
  onRefresh,
  onOpenPreview,
  onOpenShare,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'shared'>('all');

  // Edit metadata modal state
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm state
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const categories = ['All', 'Legal & Contracts', 'Financial Reports', 'Security & Compliance', 'Human Resources', 'General'];

  // Filtering
  const filtered = documents.filter((doc) => {
    // Tab filter
    if (filterTab === 'mine' && doc.owner_id !== user?.id) return false;
    if (filterTab === 'shared' && doc.owner_id === user?.id) return false;

    // Category filter
    if (selectedCategory !== 'All' && doc.category !== selectedCategory) return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchOwner = doc.owner_name.toLowerCase().includes(q);
      const matchDesc = doc.description?.toLowerCase().includes(q);
      const matchExt = doc.file_extension.toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchDesc && !matchExt) return false;
    }

    return true;
  });

  const handleStartEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditDescription(doc.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setEditLoading(true);
    try {
      await api.updateDocument(editingDoc.id, {
        name: editName,
        category: editCategory,
        description: editDescription,
      });
      setEditingDoc(null);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update document');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    setDeleteLoading(true);
    try {
      await api.deleteDocument(deletingDoc.id);
      setDeletingDoc(null);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getExtBadgeClass = (ext: string) => {
    switch (ext.toLowerCase()) {
      case 'pdf':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'docx':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'xlsx':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'txt':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Controls */}
      <div className="bg-[#1C2541]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Accessible ({documents.length})
          </button>
          <button
            onClick={() => setFilterTab('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'mine' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Documents ({documents.filter((d) => d.owner_id === user?.id).length})
          </button>
          <button
            onClick={() => setFilterTab('shared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'shared' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Shared with Me ({documents.filter((d) => d.owner_id !== user?.id).length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center space-x-3 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, owner, or file type..."
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading secure vault repository...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1C2541]/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No authorized documents found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'All'
              ? 'No documents match your filter criteria.'
              : 'You have not uploaded or received permissions for any documents yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const isOwner = doc.owner_id === user?.id;
            const canEdit = isOwner || doc.user_permission === 'Editor';
            const canDelete = isOwner;
            const canShare = isOwner;

            return (
              <div
                key={doc.id}
                className="bg-[#1C2541]/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all hover:shadow-2xl flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Ext Badge, Category, Permission */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border font-mono ${getExtBadgeClass(
                        doc.file_extension
                      )}`}
                    >
                      {doc.file_extension}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {doc.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          doc.user_permission === 'Owner'
                            ? 'bg-blue-950 text-blue-300 border-blue-700/60'
                            : doc.user_permission === 'Editor'
                            ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                        }`}
                      >
                        {doc.user_permission}
                      </span>
                    </div>
                  </div>

                  {/* Document Title & Description */}
                  <h3
                    onClick={() => onOpenPreview(doc)}
                    className="font-bold text-sm text-white hover:text-blue-400 cursor-pointer transition-colors line-clamp-1 mb-1"
                    title={doc.name}
                  >
                    {doc.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem]">
                    {doc.description || 'No confidentiality description provided.'}
                  </p>

                  {/* Metadata Row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-slate-400">
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="truncate max-w-[130px]">{doc.owner_name}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-slate-400">
                        <HardDrive className="w-3 h-3" />
                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      <span className="font-mono text-cyan-400/80">SHA: {doc.checksum_sha256.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenPreview(doc)}
                      className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title="Secure Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => api.downloadDocument(doc.id, doc.original_filename)}
                      className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleStartEdit(doc)}
                        className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {canShare && (
                      <button
                        onClick={() => onOpenShare(doc)}
                        className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                        title="Manage Permissions"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Permissions</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeletingDoc(doc)}
                        className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Edit Details Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Edit Document Metadata</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Legal & Contracts">Legal & Contracts</option>
                  <option value="Financial Reports">Financial Reports</option>
                  <option value="Security & Compliance">Security & Compliance</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#1C2541] border border-rose-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">Permanent Deletion</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong>{deletingDoc.name}</strong>? Physical file and all
              associated permissions will be removed from the private vault.
            </p>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
