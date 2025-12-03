import { useState } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { streamLabsService } from '../services/streamlabs';
import { streamElementsService } from '../services/streamelements';

export function GateControl() {
  const { settings, toggleGate, providerConnection, addItem } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const isOpen = settings.isOpen;

  const handleToggle = async () => {
    setIsLoading(true);
    
    try {
      // Control the provider's alert queue if connected
      if (providerConnection.isConnected) {
        if (providerConnection.provider === 'streamlabs') {
          if (isOpen) {
            await streamLabsService.pauseQueue();
          } else {
            await streamLabsService.unpauseQueue();
          }
        } else if (providerConnection.provider === 'streamelements') {
          if (isOpen) {
            await streamElementsService.pauseAlerts();
          } else {
            await streamElementsService.unpauseAlerts();
          }
        }
      }
      
      // Toggle local state
      toggleGate();
    } catch (error) {
      console.error('Failed to toggle gate:', error);
      // Still toggle local state even if API fails
      toggleGate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAlert = () => {
    const testMessages = [
      "This is a test message from the dashboard!",
      "Woof woof! Testing the TTS system!",
      "Hello from MinaQueue! Your alerts are working!",
      "Testing 1, 2, 3... Is this thing on?",
    ];
    
    addItem({
      id: `test-${Date.now()}`,
      username: 'TestUser',
      message: testMessages[Math.floor(Math.random() * testMessages.length)],
      amount: 100,
      timestamp: Date.now(),
      status: 'pending',
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <h2 className="text-lg font-semibold text-bone-white/80">
        {isOpen ? '🚪 GATE OPEN' : '🔒 GATE CLOSED'}
      </h2>

      {/* Toggle Switch */}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative w-32 h-16 rounded-full transition-all duration-300
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${isOpen 
            ? 'bg-cerber-violet shadow-lg shadow-cerber-violet/50' 
            : 'bg-gray-600'
          }
        `}
        aria-label={isOpen ? 'Close Gate' : 'Open Gate'}
      >
        {/* Switch Knob */}
        <div
          className={`
            absolute top-2 w-12 h-12 rounded-full bg-bone-white
            transition-all duration-300 shadow-md flex items-center justify-center
            ${isOpen ? 'left-[calc(100%-3.5rem)]' : 'left-2'}
          `}
        >
          {isLoading && <Loader2 className="w-5 h-5 text-cerber-violet animate-spin" />}
        </div>
      </button>

      <p className="text-sm text-bone-white/60">
        {providerConnection.isConnected ? (
          isOpen 
            ? `${providerConnection.provider === 'streamlabs' ? 'StreamLabs' : 'StreamElements'} alerts playing` 
            : `${providerConnection.provider === 'streamlabs' ? 'StreamLabs' : 'StreamElements'} alerts paused`
        ) : (
          isOpen 
            ? 'Messages will auto-play' 
            : 'Messages will queue silently'
        )}
      </p>

      {/* Test Alert Button */}
      <button
        onClick={handleTestAlert}
        className="mt-2 px-4 py-2 bg-squeaky-pink/20 text-squeaky-pink border border-squeaky-pink/50 rounded-lg hover:bg-squeaky-pink/30 transition-colors flex items-center gap-2 text-sm"
      >
        <FlaskConical className="w-4 h-4" />
        Send Test Alert
      </button>
    </div>
  );
}
