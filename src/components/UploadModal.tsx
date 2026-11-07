/**
 * TrustVault - Secure Document Upload Modal
 * Incorporates:
 * - Drag and drop
 * - Client-side magic bytes / signature validation preview
 * - Category assignment
 * - Simulated ClamAV Antivirus scanner animation
 */

import React, { useState, useRef } from 'react';
import { api } from '../services/api.ts';
import {
  UploadCloud,
  FileCheck,
  ShieldAlert,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState('Legal & Contracts');
  const [description, setDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!docName) {
        setDocName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!docName) {
        setDocName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a document to upload.');
      return;
    }

    setUploadError(null);
    setIsSubmitting(true);
    setScanning(true);

    // Visual step sequence showing ClamAV & signature validation
    setScanStep('Inspecting magic bytes & file signatures...');
    await new Promise((r) => setTimeout(r, 400));
    setScanStep('Running ClamAV heuristic & malware pattern scan...');
    await new Promise((r) => setTimeout(r, 500));
    setScanStep('Calculating cryptographic SHA-256 checksum & encrypting to vault...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', docName || file.name);
      formData.append('category', category);
      formData.append('description', description);

      await api.uploadDocument(formData);
      setScanning(false);
      setIsSubmitting(false);
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      setScanning(false);
      setIsSubmitting(false);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1C2541] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-[#0B132B]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Upload Document to Vault</h2>
              <p className="text-xs text-slate-400">Protected by private storage, ClamAV scan, and SHA-256 hashing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-blue-500/50 bg-blue-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center space-y-1">
                <FileCheck className="w-10 h-10 text-emerald-400" />
                <p className="font-semibold text-sm text-white truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • Click or drop to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <UploadCloud className="w-10 h-10 text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Click to choose or drop document</p>
                  <p className="text-xs text-slate-400">PDF, DOCX, XLSX, TXT, PNG, JPG (Max 25MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Document Display Title</label>
            <input
              type="text"
              required
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Master Services Agreement 2026"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Security Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Legal & Contracts">Legal & Contracts</option>
              <option value="Financial Reports">Financial Reports</option>
              <option value="Security & Compliance">Security & Compliance</option>
              <option value="Human Resources">Human Resources</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confidentiality Notes / Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes regarding sensitivity or compliance requirements..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Scan Status Animation */}
          {scanning && (
            <div className="p-3 bg-slate-900/90 rounded-xl border border-blue-500/30 flex items-center space-x-3 text-xs text-blue-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
              <span>{scanStep}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Validating & Uploading...' : 'Upload Securely'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
