import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Tag, Document, DocumentCategory } from '../types';
import { Search, Filter, Trash2, Edit, Eye, X, Tag as TagIcon } from 'lucide-react';

import { apiService } from '../services/apiService';
import { DocumentTable } from './DocumentTable';
import { claudeService } from '../services/claudeService';
import { Spinner } from './ui/Spinner';
import { PREDEFINED_TAGS } from '../constants';
import { useDocumentForm } from '../contexts/DocumentFormContext';
import { useToast } from '../contexts/ToastContext';
import { useRefresh } from '../contexts/RefreshContext';
import { Modal } from './ui/Modal';
import { TagInput } from './ui/TagInput';

const BulkActionsToolbar: React.FC<{
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onAddTag: () => void;
}> = ({ selectedCount, onClear, onDelete, onAddTag }) => (
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-40 p-4 transform-gpu">
    <div className="bg-slate-800 text-white rounded-lg shadow-2xl flex items-center justify-between p-3 animate-fade-in-up">
        <p className="font-semibold">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</p>
        <div className="flex items-center gap-2">
            <button onClick={onAddTag} title="Add Tag" className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-md text-sm transition-colors"><TagIcon size={16} /> <span className="hidden sm:inline">Add Tag</span></button>
            <button onClick={onDelete} title="Delete" className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-md text-sm transition-colors"><Trash2 size={16} /> <span className="hidden sm:inline">Delete</span></button>
            <button onClick={onClear} title="Clear Selection" className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"><X size={18} /></button>
        </div>
    </div>
  </div>
);

const AddTagModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddTag: (tag: Tag) => void;
}> = ({ isOpen, onClose, onAddTag }) => {
    const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

    const handleAdd = () => {
        if(selectedTags.length > 0) {
            onAddTag(selectedTags[0]); // Add one tag at a time for simplicity
            onClose();
        }
    }
    
    useEffect(() => {
        if(isOpen) {
            setSelectedTags([]);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Tag to Selected Documents">
            <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-400">Select an existing tag or create a new one to add to all selected documents.</p>
                <TagInput label="Tag" availableTags={PREDEFINED_TAGS} selectedTags={selectedTags} onChange={setSelectedTags} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                <button type="button" onClick={handleAdd} disabled={selectedTags.length === 0} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50">Add Tag</button>
            </div>
        </Modal>
    )
}

export const DocumentListPage: React.FC<{ category: DocumentCategory | 'All'; user: User; }> = ({ category, user }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTagModalOpen, setTagModalOpen] = useState(false);

  const { openForm } = useDocumentForm();
  const { addToast } = useToast();
  const { setRefreshFunctions } = useRefresh();

  const [isFilterOpen, setFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await apiService.getDocuments(category !== 'All' ? category : undefined);
      setDocuments(docs);
    } catch (e) {
      addToast('Failed to fetch documents.', 'error');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, addToast]);

  useEffect(() => {
    fetchDocuments();
    setRefreshFunctions(prevState => ({ ...prevState, refreshDocuments: fetchDocuments }));
    setSelectedIds(new Set()); // Clear selection on category change
  }, [fetchDocuments, setRefreshFunctions, category]);

  const handleAiSearch = async (query: string) => {
    if (!query) {
      setAiFilteredIds(null);
      return;
    }
    setIsAiSearching(true);
    setSelectedIds(new Set());
    try {
      const allDocs = await apiService.getDocuments();
      const ids = await claudeService.smartSearch(query, allDocs);
      setAiFilteredIds(ids);
    } catch (e) {
      addToast('AI search failed. Please try again.', 'error');
      console.error(e);
      setAiFilteredIds([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleEdit = (doc: Document) => {
    openForm({ document: doc, category: doc.category });
  };
  
  const handleDelete = async (docId: string, fileName?: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        try {
            await apiService.deleteDocument(docId, fileName);
            addToast('Document deleted successfully.', 'success');
            fetchDocuments();
        } catch (e) {
            addToast('Failed to delete document.', 'error');
            console.error(e);
        }
    }
  };

  const filteredDocuments = useMemo(() => {
    let docs = [...documents];
    if (category === 'All' && aiFilteredIds !== null) {
      const idSet = new Set(aiFilteredIds);
      docs = docs.filter(doc => idSet.has(doc.id));
    }

    if (searchTerm && category !== 'All') {
      const lowercasedTerm = searchTerm.toLowerCase();
      docs = docs.filter(doc => Object.values(doc).some(value => String(value).toLowerCase().includes(lowercasedTerm)));
    }

    if (dateRange.start) docs = docs.filter(doc => new Date(doc.createdAt) >= new Date(dateRange.start));
    if (dateRange.end) docs = docs.filter(doc => new Date(doc.createdAt) <= new Date(dateRange.end));
    if (selectedTags.length > 0) docs = docs.filter(doc => doc.tags.some(tag => selectedTags.includes(tag.label)));

    return docs;
  }, [documents, searchTerm, aiFilteredIds, category, dateRange, selectedTags]);

  // Bulk Actions
  const handleSelectOne = (docId: string, isSelected: boolean) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (isSelected) newSet.add(docId);
        else newSet.delete(docId);
        return newSet;
    });
  }

  const handleSelectAll = (isSelected: boolean) => {
      if (isSelected) {
          setSelectedIds(new Set(filteredDocuments.map(d => d.id)));
      } else {
          setSelectedIds(new Set());
      }
  }
  
  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} documents? This action cannot be undone.`)) {
        try {
            await apiService.deleteMultipleDocuments(Array.from(selectedIds));
            addToast(`${selectedIds.size} documents deleted successfully.`, 'success');
            setSelectedIds(new Set());
            fetchDocuments();
        } catch (e) {
            addToast('Failed to delete some documents.', 'error');
        }
    }
  }

  const handleBulkAddTag = async (tag: Tag) => {
    try {
        await apiService.addTagToMultipleDocuments(Array.from(selectedIds), tag);
        addToast(`Tag '${tag.label}' added to ${selectedIds.size} documents.`, 'success');
        setSelectedIds(new Set());
        fetchDocuments();
    } catch (e) {
        addToast('Failed to add tag to documents.', 'error');
    }
  };


  const activeFilterCount = (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0) + selectedTags.length;
  const title = category === 'All' ? 'All Documents' : `${category}s`;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          {category === 'All' ? (
            <form className="relative w-full md:w-1/2 lg:w-1/3" onSubmit={(e) => { e.preventDefault(); handleAiSearch(searchTerm); }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Ask AI to find documents... (e.g., 'memos from last week')" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {isAiSearching && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2" />}
            </form>
          ) : (
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="relative">
                  <button onClick={() => setFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <Filter size={16} />
                      <span>Filter</span>
                      {activeFilterCount > 0 && <span className="px-2 py-0.5 text-xs text-white bg-blue-600 rounded-full">{activeFilterCount}</span>}
                  </button>
                  {isFilterOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 z-10 border dark:border-slate-700 space-y-4">
                          <h4 className="font-semibold">Advanced Filters</h4>
                          <div>
                              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Date Range</label>
                              <div className="flex gap-2">
                                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="input-field" />
                                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="input-field" />
                              </div>
                          </div>
                          <div>
                             <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tags</label>
                             <div className="space-y-1 max-h-40 overflow-y-auto">
                                 {PREDEFINED_TAGS.map(tag => (
                                     <label key={tag.label} className="flex items-center gap-2">
                                         <input type="checkbox" checked={selectedTags.includes(tag.label)} onChange={() => { setSelectedTags(prev => prev.includes(tag.label) ? prev.filter(t => t !== tag.label) : [...prev, tag.label]) }} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                         <span className={`px-2 py-0.5 text-xs rounded-full text-white ${tag.color}`}>{tag.label}</span>
                                     </label>
                                 ))}
                             </div>
                          </div>
                      </div>
                  )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          {loading || isAiSearching ? (
            <div className="flex justify-center items-center h-96"><Spinner size="large" /></div>
          ) : (
            <DocumentTable documents={filteredDocuments} category={category} onEdit={handleEdit} onDelete={handleDelete} selectedIds={selectedIds} onSelectOne={handleSelectOne} onSelectAll={handleSelectAll} />
          )}
        </div>
      </div>
      {selectedIds.size > 0 && (
        <BulkActionsToolbar selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())} onDelete={handleBulkDelete} onAddTag={() => setTagModalOpen(true)} />
      )}
      <AddTagModal isOpen={isTagModalOpen} onClose={() => setTagModalOpen(false)} onAddTag={handleBulkAddTag} />
    </>
  );
};