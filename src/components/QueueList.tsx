import { Skull } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { BoneCard } from './BoneCard';

interface QueueListProps {
  onPlayItem: (id: string) => void;
}

export function QueueList({ onPlayItem }: QueueListProps) {
  const { queue, removeItem, clearPlayed } = useAppStore();

  const pendingItems = queue.filter((item) => item.status !== 'played');
  const playedItems = queue.filter((item) => item.status === 'played');

  return (
    <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-bone-white flex items-center gap-2">
          <Skull className="w-5 h-5 text-cerber-violet" />
          Queue ({pendingItems.length} pending)
        </h2>
        {playedItems.length > 0 && (
          <button
            onClick={clearPlayed}
            className="text-sm text-bone-white/60 hover:text-bone-white transition-colors"
          >
            Clear played ({playedItems.length})
          </button>
        )}
      </div>

      {/* Queue Items */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-bone-white/40">
            <Skull className="w-16 h-16 mb-4" />
            <p>No messages in queue</p>
            <p className="text-sm">Waiting for bits...</p>
          </div>
        ) : (
          queue.map((item) => (
            <BoneCard
              key={item.id}
              item={item}
              onPlay={() => onPlayItem(item.id)}
              onDelete={() => removeItem(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
