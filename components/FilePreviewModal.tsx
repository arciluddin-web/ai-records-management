
import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Download, Sparkles } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { claudeService } from '../services/claudeService';
import { Spinner } from './ui/Spinner';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileMimeType: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, fileUrl, fileName, fileMimeType }) => {
  const canPreview = fileMimeType.startsWith('image/') || fileMimeType === 'application/pdf';
  const { addToast } = useToast();

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary('');
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: fileMimeType });

      const result = await claudeService.summarizeDocument(file);
      setSummary(result);
      addToast('Summary generated successfully.', 'success');
    } catch (error) {
      console.error('Summarization failed', error);
      addToast('Failed to generate summary.', 'error');
    } finally {
      setIsSummarizing(false);
    }
  };
  
  const handleClose = () => {
    setSummary('');
    setIsSummarizing(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Preview: ${fileName}`} size="4xl">
      <div className="flex flex-col md:flex-row gap-4 h-[80vh]">
        <div className="md:w-2/3 h-full bg-slate-200 dark:bg-slate-900 rounded-lg p-2">
            {canPreview ? (
              fileMimeType.startsWith('image/') ? (
                <img src={fileUrl} alt={fileName} className="w-full h-full object-contain" />
              ) : (
                <embed src={fileUrl} type="application/pdf" className="w-full h-full" />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <p className="text-lg font-semibold">Preview not available for this file type.</p>
                <p className="text-sm mb-4">({fileMimeType})</p>
                <a
                  href={fileUrl}
                  download={fileName}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                  <Download size={16} />
                  Download
                </a>
              </div>
            )}
        </div>
        <div className="md:w-1/3 h-full flex flex-col space-y-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">AI Tools</h3>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold mb-2">Document Summary</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Get a quick summary of the document's content.</p>
                <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                    >
                    {isSummarizing ? <Spinner /> : <Sparkles size={16} />}
                    {isSummarizing ? 'Summarizing...' : 'Summarize with AI'}
                </button>
            </div>
            {(isSummarizing || summary) && (
                <div className="flex-grow p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg overflow-y-auto">
                    {isSummarizing ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {summary}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
};
