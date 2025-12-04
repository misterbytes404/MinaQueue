// Queue Item - represents a single TTS message in the queue
export interface QueueItem {
  id: string;
  username: string;
  amount: number;
  message: string;
  timestamp: number;
  status: 'pending' | 'playing' | 'played';
  type: 'bits' | 'donation' | 'subscription' | 'other';
}

// Alert Provider Types
export type AlertProvider = 'streamelements' | 'none';

// Provider Connection State
export interface ProviderConnection {
  provider: AlertProvider;
  isConnected: boolean;
  accessToken: string | null;
  socketToken: string | null;
  username: string | null;
}

// Overlay Customization Settings
export interface OverlaySettings {
  // Alert Image/GIF
  alertImageUrl: string | null; // URL or base64 data URL
  alertImageSize: number; // Size in pixels (width, height auto)
  
  // Text Styling
  fontFamily: string;
  fontSize: number;
  usernameColor: string;
  amountColor: string;
  messageColor: string;
  
  // Background
  alertBackgroundColor: string;
  alertBorderColor: string;
  
  // Animation
  alertDuration: number; // Base duration in ms
  showAmount: boolean;
  showMessage: boolean;
  
  // TTS Settings
  ttsVoice: string; // StreamElements voice ID (e.g., 'Brian', 'Amy')
  ttsVolume: number; // Volume level 0-1
}

// Application Settings
export interface AppSettings {
  minBits: number;
  volume: number;
  isOpen: boolean; // The "Gate" status
  provider: AlertProvider;
  overlay: OverlaySettings;
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// StreamElements Event Types  
export interface StreamElementsEvent {
  _id: string;
  type: 'tip' | 'cheer' | 'subscriber' | 'follow';
  data: {
    username: string;
    amount: number;
    message: string;
    displayName?: string;
  };
}
