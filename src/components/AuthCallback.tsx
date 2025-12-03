import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { streamLabsService } from '../services/streamlabs';
import { error } from '../lib/logger';

/**
 * OAuth callback handler component
 * Handles the redirect from StreamLabs OAuth
 */
export function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const { setProviderConnection, setConnectionStatus, addItem, settings } = useAppStore();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const authError = urlParams.get('error');

      if (authError) {
        setStatus('error');
        setMessage(`Authentication failed: ${authError}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      try {
        // Exchange code for tokens
        const { accessToken, socketToken } = await streamLabsService.exchangeCodeForToken(code);
        
        // Get user info
        const userInfo = await streamLabsService.getUserInfo(accessToken);

        // Connect to socket
        streamLabsService.setAccessToken(accessToken);
        streamLabsService.connectSocket(
          socketToken,
          (item) => {
            if (item.amount >= settings.minBits) {
              addItem(item);
            }
          },
          (connected) => {
            setConnectionStatus(connected ? 'connected' : 'disconnected');
          }
        );

        // Update store
        setProviderConnection({
          provider: 'streamlabs',
          isConnected: true,
          accessToken,
          socketToken,
          username: userInfo.username,
        });
        setConnectionStatus('connected');

        setStatus('success');
        setMessage('Successfully connected to StreamLabs!');

        // Close popup after success
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: 'STREAMLABS_AUTH_SUCCESS' }, '*');
            window.close();
          }
        }, 1500);
      } catch (err) {
        error('Auth error:', err);
        setStatus('error');
        setMessage('Failed to complete authentication. Please try again.');
      }
    };

    handleCallback();
  }, [setProviderConnection, setConnectionStatus, addItem, settings.minBits]);

  return (
    <div className="min-h-screen bg-bg-void flex items-center justify-center p-4">
      <div className="bg-bg-void/50 border border-bone-white/20 rounded-xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 border-4 border-cerber-violet border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-bone-white">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-bone-white font-semibold">{message}</p>
            <p className="text-sm text-bone-white/60 mt-2">This window will close automatically...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-hellfire-red rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-hellfire-red font-semibold">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-bone-white/10 hover:bg-bone-white/20 text-bone-white rounded-lg transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
