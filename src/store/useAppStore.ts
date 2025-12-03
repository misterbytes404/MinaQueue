import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueueItem, AppSettings, ConnectionStatus, AlertProvider, ProviderConnection, OverlaySettings } from '../types';
import { error } from '../lib/logger';

interface AppState {
  // Queue
  queue: QueueItem[];
  addItem: (item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>) => void;
  removeItem: (id: string) => void;
  updateItemStatus: (id: string, status: QueueItem['status']) => void;
  markItemPlayed: (id: string) => void;
  clearPlayed: () => void;
  
  // Settings
  settings: AppSettings;
  setMinBits: (minBits: number) => void;
  setVolume: (volume: number) => void;
  setSelectedVoiceURI: (uri: string | null) => void;
  toggleGate: () => void;
  setGateOpen: (isOpen: boolean) => void;
  setProvider: (provider: AlertProvider) => void;
  updateOverlaySettings: (overlay: Partial<OverlaySettings>) => void;
  
  // Provider Connection
  providerConnection: ProviderConnection;
  setProviderConnection: (connection: Partial<ProviderConnection>) => void;
  disconnectProvider: () => void;
  
  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // Cross-tab sync
  syncFromStorage: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Queue State
      queue: [],
      
      addItem: (item) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...item,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              status: 'pending',
            },
          ],
        })),
      
      removeItem: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),
      
      updateItemStatus: (id, status) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, status } : item
          ),
        })),
      
      markItemPlayed: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, status: 'played' as const } : item
          ),
        })),
      
      clearPlayed: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.status !== 'played'),
        })),

      // Settings State
      settings: {
        minBits: 200,
        volume: 1.0,
        selectedVoiceURI: null,
        isOpen: true,
        provider: 'none',
        overlay: {
          alertImageUrl: null,
          alertImageSize: 150,
          fontFamily: 'Segoe UI',
          fontSize: 24,
          usernameColor: '#F5E6D3', // bone-white
          amountColor: '#FF99CC', // squeaky-pink
          messageColor: '#F5E6D3', // bone-white
          alertBackgroundColor: '#1A1025', // bg-void
          alertBorderColor: '#B766D6', // cerber-violet
          alertDuration: 5000,
          showAmount: true,
          showMessage: true,
        },
      },
      
      setMinBits: (minBits) =>
        set((state) => ({
          settings: { ...state.settings, minBits },
        })),
      
      setVolume: (volume) =>
        set((state) => ({
          settings: { ...state.settings, volume },
        })),
      
      setSelectedVoiceURI: (selectedVoiceURI) =>
        set((state) => ({
          settings: { ...state.settings, selectedVoiceURI },
        })),
      
      toggleGate: () =>
        set((state) => ({
          settings: { ...state.settings, isOpen: !state.settings.isOpen },
        })),
      
      setGateOpen: (isOpen) =>
        set((state) => ({
          settings: { ...state.settings, isOpen },
        })),
        
      setProvider: (provider) =>
        set((state) => ({
          settings: { ...state.settings, provider },
        })),
        
      updateOverlaySettings: (overlay) =>
        set((state) => ({
          settings: {
            ...state.settings,
            overlay: { ...state.settings.overlay, ...overlay },
          },
        })),

      // Provider Connection State
      providerConnection: {
        provider: 'none',
        isConnected: false,
        accessToken: null,
        socketToken: null,
        username: null,
      },
      
      setProviderConnection: (connection) =>
        set((state) => ({
          providerConnection: { ...state.providerConnection, ...connection },
        })),
        
      disconnectProvider: () =>
        set({
          providerConnection: {
            provider: 'none',
            isConnected: false,
            accessToken: null,
            socketToken: null,
            username: null,
          },
        }),

      // Connection State
      connectionStatus: 'disconnected',
      
      setConnectionStatus: (connectionStatus) =>
        set({ connectionStatus }),
        
      // Cross-tab sync - reload state from localStorage
      syncFromStorage: () => {
        try {
          const stored = localStorage.getItem('minaqueue-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state) {
              set((state) => ({
                queue: parsed.state.queue || state.queue,
                settings: parsed.state.settings || state.settings,
                providerConnection: {
                  ...state.providerConnection,
                  provider: parsed.state.providerConnection?.provider || state.providerConnection.provider,
                  accessToken: parsed.state.providerConnection?.accessToken || state.providerConnection.accessToken,
                  socketToken: parsed.state.providerConnection?.socketToken || state.providerConnection.socketToken,
                  username: parsed.state.providerConnection?.username || state.providerConnection.username,
                },
              }));
            }
          }
        } catch (e) {
          error('Failed to sync from storage:', e);
        }
      },
    }),
    {
      name: 'minaqueue-storage',
      partialize: (state) => ({
        settings: state.settings,
        queue: state.queue, // Persist queue for cross-tab sync
        // Only persist credentials, not connection state (isConnected is determined at runtime)
        providerConnection: {
          provider: state.providerConnection.provider,
          accessToken: state.providerConnection.accessToken,
          socketToken: state.providerConnection.socketToken,
          username: state.providerConnection.username,
          // Explicitly set isConnected to false on persist - will be updated when socket connects
          isConnected: false,
        },
      }),
    }
  )
);

// Listen for storage events from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'minaqueue-storage') {
      useAppStore.getState().syncFromStorage();
    }
  });
}
