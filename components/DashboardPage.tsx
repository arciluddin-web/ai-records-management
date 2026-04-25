import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, FileText, Send, Inbox } from 'lucide-react';
import { apiService } from '../services/apiService';
import { Document, DocumentCategory } from '../types';
import { useDocumentForm } from '../contexts/DocumentFormContext';
import { useRefresh } from '../contexts/RefreshContext';
import { Spinner } from './ui/Spinner';
import { Link } from 'react-router-dom';

const CATEGORY_COLORS: { [key in DocumentCategory]: { bg: string; text: string; icon: React.ReactNode } } = {
  [DocumentCategory.Issuance]: { bg: 'bg-sky-500', text: 'text-sky-500', icon: <FileText className="text-white" /> },
  [DocumentCategory.Released]: { bg: 'bg-emerald-500', text: 'text-emerald-500', icon: <Send className="text-white" /> },
  [DocumentCategory.Received]: { bg: 'bg-amber-500', text: 'text-amber-500', icon: <Inbox className="text-white" /> },
};


const StatCard: React.FC<{ title: string; count: number; icon: React.ReactNode; color: string; onAdd: () => void; loading: boolean; }> = ({ title, count, icon, color, onAdd, loading }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="mt-4 h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
      ) : (
        <p className="text-5xl font-bold text-slate-800 dark:text-slate-100 mt-2">{count}</p>
      )}
    </div>
    <button onClick={onAdd} className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors">
      <Plus size={16} />
      Add New
    </button>
  </div>
);

const RecentActivityFeed: React.FC<{ documents: Document[], loading: boolean }> = ({ documents, loading }) => {
    if (loading) {
        return <div className="h-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-center"><Spinner /></div>
    }
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Activity</h3>
            {documents.length > 0 ? (
                <ul className="space-y-4">
                    {documents.slice(0, 5).map(doc => (
                        <li key={doc.id} className="flex items-center gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${CATEGORY_COLORS[doc.category].bg}`}>
                                {CATEGORY_COLORS[doc.category].icon}
                            </div>
                            <div className="flex-grow truncate">
                                <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                                    {doc.category === DocumentCategory.Issuance ? doc.subject : doc.details}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {doc.category} &middot; {new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <Link to={`/documents/all`} className="text-xs font-semibold text-blue-600 hover:underline">View</Link>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-center text-slate-500 dark:text-slate-400">No recent documents.</p>}
        </div>
    )
};


export const DashboardPage: React.FC = () => {
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { openForm } = useDocumentForm();
  const { setRefreshFunctions } = useRefresh();

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const docs = await apiService.getDocuments();
    setAllDocs(docs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
    setRefreshFunctions(prevState => ({ ...prevState, refreshDashboard: fetchDocs }));
  }, [fetchDocs, setRefreshFunctions]);

  const { counts, recentDocuments } = useMemo(() => {
    const newCounts = {
      Issuance: allDocs.filter(d => d.category === DocumentCategory.Issuance).length,
      Released: allDocs.filter(d => d.category === DocumentCategory.Released).length,
      Received: allDocs.filter(d => d.category === DocumentCategory.Received).length,
    };
    
    return { counts: newCounts, recentDocuments: allDocs };
  }, [allDocs]);

  const handleAddNew = (category: DocumentCategory) => {
    openForm({ category });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Issuances" count={counts.Issuance} icon={CATEGORY_COLORS.Issuance.icon} color={CATEGORY_COLORS.Issuance.bg} onAdd={() => handleAddNew(DocumentCategory.Issuance)} loading={loading} />
        <StatCard title="Released Documents" count={counts.Released} icon={CATEGORY_COLORS.Released.icon} color={CATEGORY_COLORS.Released.bg} onAdd={() => handleAddNew(DocumentCategory.Released)} loading={loading} />
        <StatCard title="Received Documents" count={counts.Received} icon={CATEGORY_COLORS.Received.icon} color={CATEGORY_COLORS.Received.bg} onAdd={() => handleAddNew(DocumentCategory.Received)} loading={loading} />
      </div>
      <RecentActivityFeed documents={recentDocuments} loading={loading} />
    </div>
  );
};
