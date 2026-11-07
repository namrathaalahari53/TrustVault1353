/**
 * TrustVault - Secure Document Preview & Details Modal
 * Streams document content inside an isolated, sandboxed container.
 * Displays cryptographic SHA-256 checksum and metadata.
 */

import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../types.ts';
import { api } from '../services/api.ts';
import {
  FileText,
  Download,
  X,
  ShieldCheck,
  Calendar,
  User,
  Folder,
  Hash,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ document, isOpen, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    let activeUrl: string | null = null;

    if (isOpen && document) {
      setLoading(true);
      setError(null);
      setTextContent(null);

      api
        .getPreviewUrl(document.id)
        .then(async (res) => {
          activeUrl = res.url;
          setPreviewUrl(res.url);
          setMimeType(res.mimeType);

          // If text file, read text directly for clean syntax display
          if (document.file_extension === 'txt' || res.mimeType.startsWith('text/')) {
            try {
              const textRes = await fetch(res.url);
              const text = await textRes.text();
              setTextContent(text);
            } catch {
              // fallback
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Access Denied: Unable to preview document');
          setLoading(false);
        });
    }

    return () => {
      if (activeUrl) {
        window.URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(document.checksum_sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownload = async () => {
    try {
      await api.downloadDocument(document.id, document.original_filename);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(document.file_extension);
  const isPdf = document.file_extension === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#1C2541] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-[#0B132B]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-base truncate max-w-md">{document.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {document.user_permission}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {document.original_filename} • {(document.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Metadata Bar */}
        <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-slate-400">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Owner: <strong className="text-white">{document.owner_name}</strong></span>
            </span>
            <span className="flex items-center space-x-1 text-slate-400">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>Category: <strong className="text-white">{document.category}</strong></span>
            </span>
            <span className="flex items-center space-x-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Uploaded: <strong className="text-white">{new Date(document.created_at).toLocaleDateString()}</strong></span>
            </span>
          </div>

          {/* Cryptographic Hash Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-300">
              SHA-256: {document.checksum_sha256.substring(0, 16)}...
            </span>
            <button
              onClick={handleCopyHash}
              className="text-slate-400 hover:text-white transition-colors ml-1"
              title="Copy full SHA-256 hash"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Preview Viewport */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[350px]">
          {loading ? (
            <div className="flex flex-col items-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-xs">Decrypting and streaming from secure private vault storage...</p>
            </div>
          ) : error ? (
            <div className="p-6 max-w-md rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">Preview Access Denied</h3>
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          ) : isPdf && previewUrl ? (
            <iframe
              src={previewUrl}
              title={document.name}
              className="w-full h-[550px] rounded-xl border border-slate-800 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : isImage && previewUrl ? (
            <div className="max-w-full max-h-[550px] overflow-auto rounded-xl border border-slate-800 p-2 bg-slate-900/60">
              <img
                src={previewUrl}
                alt={document.name}
                className="max-h-[500px] w-auto mx-auto rounded object-contain shadow-lg"
              />
            </div>
          ) : textContent !== null ? (
            <div className="w-full h-[450px] overflow-auto bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {textContent}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3 max-w-sm">
              <FileText className="w-12 h-12 text-slate-500 mx-auto" />
              <h4 className="font-semibold text-slate-200 text-sm">Binary Document Preview Restricted</h4>
              <p className="text-xs text-slate-400">
                This {document.file_extension.toUpperCase()} document is securely preserved in vault storage.
                Use the download action to open it in an authorized local application.
              </p>
              <button
                onClick={handleDownload}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                Download Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
