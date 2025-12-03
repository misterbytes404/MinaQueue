import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Hook to manage TTS playback from the queue.
 * NOTE: Auto-play is DISABLED - the overlay handles all alert display.
 * This hook only provides forcePlay for manual testing from dashboard.
 */
export function useTTSQueue() {
  const { queue, settings, updateItemStatus } = useAppStore();
  const isSpeakingRef = useRef(false);
  const currentItemIdRef = useRef<string | null>(null);

  const speak = useCallback(
    (text: string, itemId: string) => {
      const synth = window.speechSynthesis;
      
      // Cancel any previous speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = settings.volume;

      // Find and set the selected voice
      if (settings.selectedVoiceURI) {
        const voices = synth.getVoices();
        const selectedVoice = voices.find(
          (v) => v.voiceURI === settings.selectedVoiceURI
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        currentItemIdRef.current = itemId;
        updateItemStatus(itemId, 'playing');
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        currentItemIdRef.current = null;
        updateItemStatus(itemId, 'played');
      };

      utterance.onerror = (event) => {
        console.error('[TTS] Error:', event.error);
        isSpeakingRef.current = false;
        currentItemIdRef.current = null;
        updateItemStatus(itemId, 'played');
      };

      synth.speak(utterance);
    },
    [settings.volume, settings.selectedVoiceURI, updateItemStatus]
  );

  // Force play a specific item (manual trigger from dashboard)
  const forcePlay = useCallback(
    (itemId: string) => {
      const item = queue.find((q) => q.id === itemId);
      if (item) {
        speak(`${item.username} says: ${item.message}`, item.id);
      }
    },
    [queue, speak]
  );

  // NOTE: Auto-play is DISABLED
  // The overlay (/overlay) handles all alert display and TTS
  // Dashboard is only for viewing/managing the queue

  // Poll for speech end (some browsers don't fire onend reliably)
  useEffect(() => {
    const interval = setInterval(() => {
      const synth = window.speechSynthesis;
      if (!synth.speaking && isSpeakingRef.current) {
        // Speech ended but callback didn't fire
        if (currentItemIdRef.current) {
          updateItemStatus(currentItemIdRef.current, 'played');
        }
        isSpeakingRef.current = false;
        currentItemIdRef.current = null;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [updateItemStatus]);

  return { forcePlay };
}
