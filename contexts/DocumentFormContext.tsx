
import React, { createContext, useState, useContext, useCallback } from 'react';
import { Document, DocumentCategory } from '../types';

interface FormState {
  isOpen: boolean;
  document?: Document;
  category: DocumentCategory;
  file?: File;
}

interface DocumentFormContextType {
  formState: FormState | null;
  openForm: (options: { document?: Document; category: DocumentCategory, file?: File }) => void;
  closeForm: () => void;
}

const DocumentFormContext = createContext<DocumentFormContextType | undefined>(undefined);

export const DocumentFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formState, setFormState] = useState<FormState | null>(null);

  const openForm = useCallback((options: { document?: Document; category: DocumentCategory; file?: File }) => {
    setFormState({
      isOpen: true,
      document: options.document,
      category: options.category,
      file: options.file,
    });
  }, []);

  const closeForm = useCallback(() => {
    setFormState(null);
  }, []);
  

  return (
    <DocumentFormContext.Provider value={{ formState, openForm, closeForm }}>
      {children}
    </DocumentFormContext.Provider>
  );
};

export const useDocumentForm = () => {
  const context = useContext(DocumentFormContext);
  if (context === undefined) {
    throw new Error('useDocumentForm must be used within a DocumentFormProvider');
  }
  return context;
};
