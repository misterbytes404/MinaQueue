import { Bone, Settings } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const connectionStatus = useAppStore((state) => state.connectionStatus);

  const statusColor = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
    error: 'bg-hellfire-red',
  }[connectionStatus];

  const statusText = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Error',
  }[connectionStatus];

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-bone-white/20">
      <div className="flex items-center gap-3">
        <Bone className="w-8 h-8 text-cerber-violet" />
        <h1 className="text-2xl font-bold text-bone-white">MinaQueue</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-sm text-bone-white/70">{statusText}</span>
        </div>

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg hover:bg-bone-white/10 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6 text-bone-white" />
        </button>
      </div>
    </header>
  );
}
