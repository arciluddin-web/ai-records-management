
import React, { createContext, useState, useContext, useMemo } from 'react';

type RefreshFunctions = {
  refreshDashboard: () => void;
  refreshDocuments: () => void;
};

interface RefreshContextType {
  refreshDashboard: () => void;
  refreshDocuments: () => void;
  setRefreshFunctions: React.Dispatch<React.SetStateAction<Partial<RefreshFunctions>>>;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

const emptyFunc = () => {};

export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshFunctions, setRefreshFunctions] = useState<Partial<RefreshFunctions>>({});

  const value = useMemo(() => ({
    refreshDashboard: refreshFunctions.refreshDashboard || emptyFunc,
    refreshDocuments: refreshFunctions.refreshDocuments || emptyFunc,
    setRefreshFunctions,
  }), [refreshFunctions.refreshDashboard, refreshFunctions.refreshDocuments]);

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
