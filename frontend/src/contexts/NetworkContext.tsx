import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncService } from '../services/syncService';
import { storageService } from '../services/storage';

interface NetworkContextType {
  isConnected: boolean;
  isOnline: boolean;
  pendingSync: number;
  syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    // Listen to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);

      // Auto-sync when coming online
      if (state.isConnected && !isConnected) {
        syncNow();
      }
    });

    // Start auto-sync
    const syncInterval = syncService.startAutoSync(2);

    // Update pending count
    updatePendingCount();
    const countInterval = setInterval(updatePendingCount, 30000); // Check every 30s

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
      clearInterval(countInterval);
    };
  }, []);

  const updatePendingCount = async () => {
    const locations = await storageService.getPendingLocations();
    const messages = await storageService.getPendingMessages();
    const respondents = await storageService.getPendingRespondents();
    setPendingSync(locations.length + messages.length + respondents.length);
  };

  const syncNow = async () => {
    await syncService.syncAll();
    await updatePendingCount();
  };

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isOnline: isConnected,
        pendingSync,
        syncNow,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
