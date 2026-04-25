
import React, { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom';

import { DashboardPage } from './components/DashboardPage';
import { DocumentListPage } from './components/DocumentListPage';
import { Header } from './components/Header';
import { QuickAddModal } from './components/QuickAddModal';
import { DocumentCategory, User } from './types';
import { authService } from './services/authService';
import { DocumentFormProvider } from './contexts/DocumentFormContext';
import { DocumentFormModal } from './components/DocumentFormModal';
import { ToastProvider } from './contexts/ToastContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { ChatPage } from './components/ChatPage';

const LoginScreen: React.FC<{ onLogin: (password: string) => Promise<void> }> = ({ onLogin }) => {
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(password);
    } catch {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-2xl space-y-6 w-full max-w-sm">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">AI Records Management</h1>
        <p className="text-slate-600 dark:text-slate-300">Enter your password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const MainLayout: React.FC<{ user: User; onLogout: () => void; onQuickAdd: () => void }> = ({ user, onLogout, onQuickAdd }) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Header user={user} onLogout={onLogout} onQuickAdd={onQuickAdd} />
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isQuickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = useCallback(async (password: string) => {
    await authService.signIn(password);
  }, []);

  const handleLogout = useCallback(() => {
    authService.signOut();
  }, []);

  const handleQuickAddOpen = () => setQuickAddModalOpen(true);
  const handleQuickAddClose = () => setQuickAddModalOpen(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ToastProvider>
      <DocumentFormProvider>
        <RefreshProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} onQuickAdd={handleQuickAddOpen} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="documents/all" element={<DocumentListPage key="all" category="All" user={user} />} />
                <Route path="documents/issuance" element={<DocumentListPage key="issuance" category={DocumentCategory.Issuance} user={user} />} />
                <Route path="documents/released" element={<DocumentListPage key="released" category={DocumentCategory.Released} user={user} />} />
                <Route path="documents/received" element={<DocumentListPage key="received" category={DocumentCategory.Received} user={user} />} />
                <Route path="chat" element={<ChatPage />} />
              </Route>
            </Routes>
            <QuickAddModal isOpen={isQuickAddModalOpen} onClose={handleQuickAddClose} user={user} />
            <DocumentFormModal />
          </HashRouter>
        </RefreshProvider>
      </DocumentFormProvider>
    </ToastProvider>
  );
};

export default App;
