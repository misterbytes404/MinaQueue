import { useState, useEffect } from 'react';

/**
 * Hook to handle async loading of speechSynthesis voices.
 * Chrome requires waiting for 'voiceschanged' event.
 */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        setIsLoading(false);
      }
    };

    // Try to load voices immediately (works in Firefox)
    loadVoices();

    // Chrome fires this event when voices are ready
    synth.addEventListener('voiceschanged', loadVoices);

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  return { voices, isLoading };
}
