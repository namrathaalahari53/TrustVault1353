/**
 * TrustVault - Secure Document Sharing Platform
 * Main Application Component
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { api } from './services/api.ts';
import { DocumentItem } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DocumentList } from './components/DocumentList.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { SecurityTestSuiteView } from './components/SecurityTestSuiteView.tsx';
import { UserManagementView } from './components/UserManagementView.tsx';
import { IdorDemoView } from './components/IdorDemoView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { DocumentPreviewModal } from './components/DocumentPreviewModal.tsx';
import { SharePermissionsModal } from './components/SharePermissionsModal.tsx';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);

  const loadDocuments = async () => {
    if (!user) return;
    setDocsLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err: unknown) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex items-center justify-center text-slate-400 text-xs">
        Initializing TrustVault security environment...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setCurrentTab}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenPreview={(doc) => setPreviewDoc(doc)}
          />
        )}

        {currentTab === 'documents' && (
          <DocumentList
            documents={documents}
            loading={docsLoading}
            onRefresh={loadDocuments}
            onOpenPreview={(doc) => setPreviewDoc(doc)}
            onOpenShare={(doc) => setShareDoc(doc)}
          />
        )}

        {currentTab === 'audit' && <AuditLogsView />}

        {currentTab === 'tests' && <SecurityTestSuiteView />}

        {currentTab === 'idor' && <IdorDemoView />}

        {currentTab === 'users' && user.role === 'Administrator' && <UserManagementView />}

        {currentTab === 'profile' && <ProfileView />}
      </main>

      {/* Global Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadDocuments}
      />

      <DocumentPreviewModal
        document={previewDoc}
        isOpen={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
      />

      <SharePermissionsModal
        document={shareDoc}
        isOpen={shareDoc !== null}
        onClose={() => setShareDoc(null)}
        onPermissionsUpdated={loadDocuments}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#080d1e] py-4 text-center text-slate-500 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrustVault Secure Document Sharing Platform • Enterprise Cryptographic Defense</span>
          <span className="font-mono text-slate-400">Zero-Trust Architecture • All 18 Security Scenarios Verified</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
