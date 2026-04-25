import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const Icon = isSuccess ? CheckCircle : XCircle;

  return (
    <div
      className={`flex items-start p-4 w-full max-w-sm bg-white dark:bg-slate-800 rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 pointer-events-auto my-2`}
    >
      <div className="flex-shrink-0">
        <Icon className={`h-6 w-6 ${isSuccess ? 'text-green-500' : 'text-red-500'}`} aria-hidden="true" />
      </div>
      <div className="ml-3 w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{toast.message}</p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          onClick={() => onDismiss(toast.id)}
          className="bg-white dark:bg-slate-800 rounded-md inline-flex text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <span className="sr-only">Close</span>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    return (
        <div
          aria-live="assertive"
          className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]"
        >
          <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
          </div>
        </div>
      );
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = uuidv4();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};