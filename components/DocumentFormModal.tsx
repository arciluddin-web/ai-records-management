
import React, { useState, useEffect, useCallback } from 'react';
import { Document, DocumentCategory, HistoryEntry, Tag, Issuance, ReleasedDocument, ReceivedDocument } from '../types';
import { useDocumentForm } from '../contexts/DocumentFormContext';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { claudeService } from '../services/claudeService';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Combobox } from './ui/Combobox';
import { PREDEFINED_DOC_TYPES, PREDEFINED_TAGS } from '../constants';
import { TagInput } from './ui/TagInput';
import { Spinner } from './ui/Spinner';
import { Upload, File, Sparkles, History, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../contexts/ToastContext';
import { useRefresh } from '../contexts/RefreshContext';

export const DocumentFormModal: React.FC = () => {
  const { formState, closeForm } = useDocumentForm();
  const { addToast } = useToast();
  const { refreshDashboard, refreshDocuments } = useRefresh();

  const [formData, setFormData] = useState<Partial<Document>>({});
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const category = formState?.category;
  
  useEffect(() => {
    if (formState?.isOpen) {
      setFormData(formState.document || {});
      setAttachedFile(formState.file || null);
      setActiveTab('details');
    } else {
      setFormData({});
      setAttachedFile(null);
    }
  }, [formState]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboboxChange = (value: string) => {
    setFormData(prev => ({ ...prev, typeOfDocument: value }));
  }

  const handleTagsChange = (tags: Tag[]) => {
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!attachedFile || !category) return;
    setIsAnalyzing(true);
    try {
        const extractedData = await claudeService.extractDataFromDocument(attachedFile, category);
        setFormData(prev => {
            const existingTags = prev.tags || [];
            const newTags = extractedData.tags || [];
            const combinedTags = [...existingTags];
            newTags.forEach(newTag => {
                if (!combinedTags.some(t => t.label.toLowerCase() === newTag.label.toLowerCase())) {
                    combinedTags.push(newTag);
                }
            });
            return {...prev, ...extractedData, tags: combinedTags };
        });
        addToast("AI analysis complete, form pre-filled.", "success");
    } catch (error) {
        console.error("AI analysis failed", error);
        addToast("Failed to analyze the document with AI.", "error");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    const isEditing = !!formState?.document?.id;
    const userEmail = authService.getCurrentUser()?.email ?? 'unknown';

    let finalDoc: Document;

    if (isEditing) {
        const historyEntry: HistoryEntry = { date: new Date().toISOString(), action: 'Updated', details: 'Document fields updated', user: userEmail };
        finalDoc = { ...formState!.document!, ...formData, history: [...(formState!.document!.history || []), historyEntry] } as Document;
    } else {
        const historyEntry: HistoryEntry = { date: new Date().toISOString(), action: 'Created', details: 'Document created', user: userEmail };
        finalDoc = {
            id: uuidv4(),
            category,
            tags: [],
            ...formData,
            createdAt: new Date().toISOString(),
            history: [historyEntry],
        } as Document;
    }

    try {
        if (isEditing) {
            await apiService.updateDocument(finalDoc.id, finalDoc, attachedFile || undefined);
        } else {
            await apiService.addDocument(finalDoc, attachedFile || undefined);
        }
        addToast(`Document ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
        refreshDashboard();
        refreshDocuments();
        closeForm();
    } catch(error) {
        console.error("Failed to save document", error);
        addToast("Failed to save document.", "error");
    }
  };
  
  if (!formState?.isOpen || !category) return null;

  const renderFields = () => {
    const commonFields = (
        <>
            { (category === DocumentCategory.Released || category === DocumentCategory.Received) &&
                <>
                    <Input label="GRDS Code" name="grdsCode" value={(formData as Partial<ReleasedDocument>).grdsCode || ''} onChange={handleChange} />
                    <Input label="Internal Code" name="internalCode" value={(formData as Partial<ReleasedDocument>).internalCode || ''} onChange={handleChange} />
                    <Input label="Document No." name="documentNo" value={(formData as Partial<ReleasedDocument>).documentNo || ''} onChange={handleChange} required />
                    <Input label="Date Released" name="dateReleased" type="date" value={(formData as Partial<ReleasedDocument>).dateReleased || ''} onChange={handleChange} />
                    <Input label="Time Released" name="timeReleased" type="time" value={(formData as Partial<ReleasedDocument>).timeReleased || ''} onChange={handleChange} />
                    <Combobox label="Type of Document" items={PREDEFINED_DOC_TYPES} value={(formData as Partial<ReleasedDocument>).typeOfDocument || ''} onChange={handleComboboxChange} />
                    <Input label="Date of Document" name="dateOfDocument" type="date" value={(formData as Partial<ReleasedDocument>).dateOfDocument || ''} onChange={handleChange} />
                    <Input label="Details" name="details" as="textarea" value={(formData as Partial<ReleasedDocument>).details || ''} onChange={handleChange} />
                    <Input label="Remarks" name="remarks" as="textarea" value={(formData as Partial<ReleasedDocument>).remarks || ''} onChange={handleChange} />
                    <Input label="Sender" name="sender" value={(formData as Partial<ReleasedDocument>).sender || ''} onChange={handleChange} />
                    <Input label="Receiver" name="receiver" value={(formData as Partial<ReleasedDocument>).receiver || ''} onChange={handleChange} />
                    <Input label="Copy Furnished" name="copyFurnished" value={(formData as Partial<ReleasedDocument>).copyFurnished || ''} onChange={handleChange} />
                    <Input label="Received By" name="receivedBy" value={(formData as Partial<ReleasedDocument>).receivedBy || ''} onChange={handleChange} />
                    <Input label="Date Delivered" name="dateDelivered" type="date" value={(formData as Partial<ReleasedDocument>).dateDelivered || ''} onChange={handleChange} />
                    <Input label="Time Delivered" name="timeDelivered" type="time" value={(formData as Partial<ReleasedDocument>).timeDelivered || ''} onChange={handleChange} />
                </>
            }
            { category === DocumentCategory.Received && <Input label="Sender Office" name="senderOffice" value={(formData as Partial<ReceivedDocument>).senderOffice || ''} onChange={handleChange} />}

            { category === DocumentCategory.Issuance &&
                 <>
                    <Input label="Control Number Sequence" name="controlNumberSequence" value={(formData as Partial<Issuance>).controlNumberSequence || ''} onChange={handleChange} required />
                    <Input label="Release Date" name="releaseDate" type="date" value={(formData as Partial<Issuance>).releaseDate || ''} onChange={handleChange} />
                    <Input label="Release Time" name="releaseTime" type="time" value={(formData as Partial<Issuance>).releaseTime || ''} onChange={handleChange} />
                    <Input label="Date of Document" name="dateOfDocument" type="date" value={(formData as Partial<Issuance>).dateOfDocument || ''} onChange={handleChange} />
                    <Input label="Heading Addressee" name="headingAddressee" value={(formData as Partial<Issuance>).headingAddressee || ''} onChange={handleChange} />
                    <Input label="Subject" name="subject" value={(formData as Partial<Issuance>).subject || ''} onChange={handleChange} required />
                    <Input label="Signatory" name="signatory" value={(formData as Partial<Issuance>).signatory || ''} onChange={handleChange} />
                    <Input label="Remarks" name="remarks" as="textarea" value={(formData as Partial<Issuance>).remarks || ''} onChange={handleChange} />
                </>
            }
            <TagInput label="Tags" availableTags={PREDEFINED_TAGS} selectedTags={formData.tags || []} onChange={handleTagsChange} />
        </>
    );
    return commonFields;
  };
  
  const renderHistory = () => (
    <div className="space-y-4 max-h-96 overflow-y-auto p-1">
        {(formData.history || []).slice().reverse().map((entry, index) => (
            <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-blue-500 mt-1"></div>
                    <div className="w-px flex-grow bg-slate-300 dark:bg-slate-600"></div>
                </div>
                <div>
                    <p className="font-semibold">{entry.action} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">by {entry.user}</span></p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{entry.details}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(entry.date).toLocaleString()}</p>
                </div>
            </div>
        ))}
    </div>
  );

  const title = formState?.document?.id ? `Edit ${category}` : `New ${category}`;

  return (
    <Modal isOpen={formState.isOpen} onClose={closeForm} title={title}>
      <form id="document-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 space-y-4">
          <h3 className="font-semibold text-lg">Attachment</h3>
          <div className="w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-center p-4 relative">
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
            <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Drag & drop or click to upload</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">PDF, PNG, JPG</p>
          </div>
          {(attachedFile || formData.fileName) && (
            <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-2 truncate">
                    <File className="w-5 h-5 text-blue-500" />
                    <span className="text-sm truncate">{attachedFile?.name || formData.fileName}</span>
                </div>
                {formData.fileUrl && <a href={formData.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View</a>}
            </div>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!attachedFile || isAnalyzing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? <Spinner /> : <Sparkles size={16} />}
            Analyze with AI to Pre-fill
          </button>
        </div>
        <div className="w-full md:w-2/3">
          <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button type="button" onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'}`}>
                      Details
                  </button>
                  {formState?.document?.id && (
                    <button type="button" onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'}`}>
                        History
                    </button>
                  )}
              </nav>
          </div>
          
          {activeTab === 'details' && <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">{renderFields()}</div>}
          {activeTab === 'history' && renderHistory()}
          
        </div>
      </form>
      <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
        <button type="button" onClick={closeForm} className="px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
        <button type="submit" form="document-form" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">Save Document</button>
      </div>
    </Modal>
  );
};
