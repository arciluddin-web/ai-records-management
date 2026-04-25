
import React, { useState, useRef, useEffect } from 'react';
import { Document, DocumentCategory, Issuance, ReleasedDocument, ReceivedDocument } from '../types';
import { FilePreviewModal } from './FilePreviewModal';
import { Edit, Trash2, Eye } from 'lucide-react';

interface DocumentTableProps {
  documents: Document[];
  category: DocumentCategory | 'All';
  onEdit: (doc: Document) => void;
  onDelete: (docId: string, fileName?: string) => void;
  selectedIds: Set<string>;
  onSelectOne: (docId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
}

const IndeterminateCheckbox = React.forwardRef<HTMLInputElement, { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>>(
    ({ indeterminate, ...rest }, ref) => {
        const defaultRef = useRef<HTMLInputElement>(null);
        const resolvedRef = ref || defaultRef;

        useEffect(() => {
            if (typeof resolvedRef === 'object' && resolvedRef.current) {
                resolvedRef.current.indeterminate = !!indeterminate;
            }
        }, [resolvedRef, indeterminate]);

        return <input type="checkbox" ref={resolvedRef} {...rest} className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900" />;
    }
);


const TableRow: React.FC<{ doc: Document; onEdit: (doc: Document) => void; onDelete: (docId: string, fileName?: string) => void; onPreview: (doc: Document) => void; isSelected: boolean; onSelect: (docId: string, isSelected: boolean) => void; showCategory: boolean; }> = ({ doc, onEdit, onDelete, onPreview, isSelected, onSelect, showCategory }) => {
    return (
        <tr className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
            <td className="px-4 py-3"><input type="checkbox" checked={isSelected} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelect(doc.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900" /></td>
            {showCategory && <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{doc.category}</td>}
            
            {doc.category === DocumentCategory.Issuance && (
                <>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{doc.controlNumberSequence}</td>
                    <td className="px-4 py-3">{doc.subject}</td>
                    <td className="px-4 py-3">{doc.signatory}</td>
                    <td className="px-4 py-3">{doc.releaseDate}</td>
                </>
            )}

            {(doc.category === DocumentCategory.Released || doc.category === DocumentCategory.Received) && (
                <>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{doc.documentNo}</td>
                    <td className="px-4 py-3">{doc.typeOfDocument}</td>
                    <td className="px-4 py-3">{doc.details}</td>
                    <td className="px-4 py-3">{doc.sender}</td>
                    <td className="px-4 py-3">{doc.receiver}</td>
                </>
            )}
            
            <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                    {doc.tags.map(tag => (
                        <span key={tag.label} className={`px-2 py-1 text-xs font-semibold text-white ${tag.color} rounded-full`}>{tag.label}</span>
                    ))}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {doc.fileUrl && <button onClick={() => onPreview(doc)} className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Eye size={18} /></button>}
                    <button onClick={() => onEdit(doc)} className="p-2 text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => onDelete(doc.id, doc.fileName)} className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                </div>
            </td>
        </tr>
    );
}

const TableHeader: React.FC<{ columns: string[]; onSelectAll: (isSelected: boolean) => void; numSelected: number; numTotal: number; }> = ({ columns, onSelectAll, numSelected, numTotal }) => {
    const isIndeterminate = numSelected > 0 && numSelected < numTotal;
    const isAllSelected = numTotal > 0 && numSelected === numTotal;

    return (
        <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
                <th className="px-4 py-3"><IndeterminateCheckbox indeterminate={isIndeterminate} checked={isAllSelected} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelectAll(e.target.checked)} /></th>
                {columns.map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">{col}</th>
                ))}
            </tr>
        </thead>
    )
};


export const DocumentTable: React.FC<DocumentTableProps> = ({ documents, category, onEdit, onDelete, selectedIds, onSelectOne, onSelectAll }) => {
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

    const getColumns = () => {
        switch (category) {
            case DocumentCategory.Issuance: return ['Control No.', 'Subject', 'Signatory', 'Release Date', 'Tags', 'Actions'];
            case DocumentCategory.Released:
            case DocumentCategory.Received: return ['Doc No.', 'Type', 'Details', 'Sender', 'Receiver', 'Tags', 'Actions'];
            case 'All': return ['Category', 'ID/Subject', 'Details', 'Date', 'Tags', 'Actions'];
            default: return ['ID', 'Details', 'Tags', 'Actions'];
        }
    };
    
    const renderAllRow = (doc: Document) => {
        let id, subject, details, date;
        if (doc.category === DocumentCategory.Issuance) {
            id = doc.controlNumberSequence; subject = doc.subject; details = doc.signatory; date = doc.releaseDate;
        } else {
            id = doc.documentNo; subject = doc.typeOfDocument; details = doc.details; date = doc.dateReleased;
        }
        const isSelected = selectedIds.has(doc.id);
        return (
            <tr key={doc.id} className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={isSelected} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSelectOne(doc.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900"/></td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{doc.category}</td>
                <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{id}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{subject}</div>
                </td>
                <td className="px-4 py-3 text-sm">{details}</td>
                <td className="px-4 py-3 text-sm">{date}</td>
                <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 2).map(tag => ( <span key={tag.label} className={`px-2 py-1 text-xs font-semibold text-white ${tag.color} rounded-full`}>{tag.label}</span> ))}
                        {doc.tags.length > 2 && <span className="text-xs text-slate-500 dark:text-slate-400">+{doc.tags.length - 2}</span>}
                    </div>
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {doc.fileUrl && <button onClick={() => setPreviewDoc(doc)} className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Eye size={18} /></button>}
                        <button onClick={() => onEdit(doc)} className="p-2 text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"><Edit size={18} /></button>
                        <button onClick={() => onDelete(doc.id, doc.fileName)} className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                    </div>
                </td>
            </tr>
        );
    }
    
    if (documents.length === 0) {
        return <div className="text-center py-16 text-slate-500 dark:text-slate-400">No documents found.</div>;
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <TableHeader columns={getColumns()} onSelectAll={onSelectAll} numSelected={selectedIds.size} numTotal={documents.length} />
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {category !== 'All' ?
                            documents.map(doc => (
                                <TableRow key={doc.id} doc={doc} onEdit={onEdit} onDelete={onDelete} onPreview={setPreviewDoc} isSelected={selectedIds.has(doc.id)} onSelect={onSelectOne} showCategory={false} />
                            )) :
                            documents.map(renderAllRow)
                        }
                    </tbody>
                </table>
            </div>
            {previewDoc && (
                <FilePreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.fileUrl!}
                    fileName={previewDoc.fileName!}
                    fileMimeType={previewDoc.fileMimeType!}
                />
            )}
        </>
    );
};