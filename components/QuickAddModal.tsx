
import React, { useState, useCallback } from 'react';
import { User } from '../types';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { claudeService } from '../services/claudeService';
import { useDocumentForm } from '../contexts/DocumentFormContext';
import { Upload, File as FileIcon, Sparkles } from 'lucide-react';
import { DocumentCategory, Document } from '../types';
import { useToast } from '../contexts/ToastContext';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, user }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openForm } = useDocumentForm();
  const { addToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const { category, data } = await claudeService.analyzeAndCategorizeDocument(file);
      addToast('Document analyzed successfully!', 'success');
      onClose(); // Close this modal
      // Open the main form modal with pre-filled data
      openForm({ category, document: data as Document, file });
    } catch (e) {
      console.error("Quick Add analysis failed", e);
      const errorMessage = "AI analysis failed. The document might be unsupported or unreadable. Please try adding it manually.";
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, onClose, openForm, addToast]);
  
  const handleClose = () => {
    setFile(null);
    setError(null);
    setIsAnalyzing(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI Quick Add">
      <div className="space-y-6">
        <p className="text-slate-600 dark:text-slate-400">
          Upload a document, and our AI will automatically classify it and extract key information, saving you from manual data entry.
        </p>
        
        <div className="w-full h-64 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-center p-4 relative bg-slate-50 dark:bg-slate-800/50">
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={handleFileChange} 
            accept=".pdf,.png,.jpg,.jpeg"
            disabled={isAnalyzing}
          />
          {!file && (
            <>
              <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Drag & drop or click to upload</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">PDF, PNG, JPG supported</p>
            </>
          )}
          {file && (
            <div className="flex flex-col items-center gap-2">
                <FileIcon className="w-12 h-12 text-blue-500" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm bg-red-100 dark:bg-red-900/40 p-3 rounded-lg">{error}</p>}
        
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
                type="button"
                onClick={handleClose}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                className="w-48 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
            >
                {isAnalyzing ? <Spinner /> : <Sparkles size={16} />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze Document'}
            </button>
        </div>
      </div>
    </Modal>
  );
};
