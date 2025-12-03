import { Play, X, Ghost, DollarSign } from 'lucide-react';
import type { QueueItem } from '../types';

interface BoneCardProps {
  item: QueueItem;
  onPlay: () => void;
  onDelete: () => void;
}

export function BoneCard({ item, onPlay, onDelete }: BoneCardProps) {
  const isPlaying = item.status === 'playing';
  const isPlayed = item.status === 'played';
  const isDonation = item.type === 'donation';

  return (
    <div
      className={`
        relative flex items-center gap-4 px-6 py-4
        rounded-full border-2 transition-all duration-300
        ${isPlaying 
          ? 'border-cerber-violet bg-cerber-violet/20 shadow-lg shadow-cerber-violet/30' 
          : isPlayed
            ? 'border-bone-white/30 bg-bone-white/5 opacity-50'
            : 'border-bone-white/50 bg-bone-white/10 hover:border-bone-white/70'
        }
      `}
    >
      {/* Bone end decoration - left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
        <div className="w-4 h-8 bg-bone-white/20 rounded-full" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-2">
        <div className="flex items-center gap-2 mb-1">
          {isDonation ? (
            <DollarSign className={`w-4 h-4 ${isPlaying ? 'text-cerber-violet animate-pulse' : 'text-green-400'}`} />
          ) : (
            <Ghost className={`w-4 h-4 ${isPlaying ? 'text-cerber-violet animate-pulse' : 'text-squeaky-pink'}`} />
          )}
          <span className="font-bold text-bone-white truncate">{item.username}</span>
          <span className={`font-semibold ${isDonation ? 'text-green-400' : 'text-squeaky-pink'}`}>
            {isDonation ? `$${item.amount}` : `${item.amount} bits`}
          </span>
        </div>
        <p className="text-sm text-bone-white/80 truncate">{item.message}</p>
      </div>

      {/* Actions */}
      {!isPlayed && (
        <div className="flex items-center gap-2">
          <button
            onClick={onPlay}
            disabled={isPlaying}
            className={`
              p-2 rounded-full transition-colors
              ${isPlaying 
                ? 'bg-cerber-violet/50 cursor-not-allowed' 
                : 'bg-cerber-violet hover:bg-cerber-violet/80'
              }
            `}
            aria-label="Play Now"
          >
            <Play className="w-4 h-4 text-bone-white" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-full bg-hellfire-red/80 hover:bg-hellfire-red transition-colors"
            aria-label="Delete"
          >
            <X className="w-4 h-4 text-bone-white" />
          </button>
        </div>
      )}

      {/* Bone end decoration - right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
        <div className="w-4 h-8 bg-bone-white/20 rounded-full" />
      </div>
    </div>
  );
}
