/**
 * Cloud TTS Service using StreamElements API
 * 
 * Uses StreamElements' free TTS API which provides consistent voices
 * across all browsers including OBS Browser Source.
 * 
 * API: https://api.streamelements.com/kappa/v2/speech?voice={voice}&text={text}
 * Returns MP3 audio that can be played via Audio element.
 */

import { info, warn, error as logError } from '../lib/logger';

// Use local proxy to avoid CORS issues with StreamElements API
const TTS_PROXY_URL = 'http://localhost:5175/tts';

// StreamElements available voices
export const STREAMELEMENTS_VOICES = [
  // English voices
  { id: 'Brian', name: 'Brian (UK Male)', language: 'en-GB', gender: 'Male' as const },
  { id: 'Amy', name: 'Amy (UK Female)', language: 'en-GB', gender: 'Female' as const },
  { id: 'Emma', name: 'Emma (UK Female)', language: 'en-GB', gender: 'Female' as const },
  { id: 'Joanna', name: 'Joanna (US Female)', language: 'en-US', gender: 'Female' as const },
  { id: 'Kendra', name: 'Kendra (US Female)', language: 'en-US', gender: 'Female' as const },
  { id: 'Kimberly', name: 'Kimberly (US Female)', language: 'en-US', gender: 'Female' as const },
  { id: 'Salli', name: 'Salli (US Female)', language: 'en-US', gender: 'Female' as const },
  { id: 'Joey', name: 'Joey (US Male)', language: 'en-US', gender: 'Male' as const },
  { id: 'Justin', name: 'Justin (US Male)', language: 'en-US', gender: 'Male' as const },
  { id: 'Matthew', name: 'Matthew (US Male)', language: 'en-US', gender: 'Male' as const },
  { id: 'Ivy', name: 'Ivy (US Child Female)', language: 'en-US', gender: 'Female' as const },
  { id: 'Nicole', name: 'Nicole (AU Female)', language: 'en-AU', gender: 'Female' as const },
  { id: 'Russell', name: 'Russell (AU Male)', language: 'en-AU', gender: 'Male' as const },
  { id: 'Geraint', name: 'Geraint (Welsh Male)', language: 'en-GB-WLS', gender: 'Male' as const },
  
  // Other languages
  { id: 'Celine', name: 'Céline (French Female)', language: 'fr-FR', gender: 'Female' as const },
  { id: 'Mathieu', name: 'Mathieu (French Male)', language: 'fr-FR', gender: 'Male' as const },
  { id: 'Hans', name: 'Hans (German Male)', language: 'de-DE', gender: 'Male' as const },
  { id: 'Marlene', name: 'Marlene (German Female)', language: 'de-DE', gender: 'Female' as const },
  { id: 'Vicki', name: 'Vicki (German Female)', language: 'de-DE', gender: 'Female' as const },
  { id: 'Conchita', name: 'Conchita (Spanish Female)', language: 'es-ES', gender: 'Female' as const },
  { id: 'Enrique', name: 'Enrique (Spanish Male)', language: 'es-ES', gender: 'Male' as const },
  { id: 'Miguel', name: 'Miguel (US Spanish Male)', language: 'es-US', gender: 'Male' as const },
  { id: 'Penelope', name: 'Penélope (US Spanish Female)', language: 'es-US', gender: 'Female' as const },
  { id: 'Carla', name: 'Carla (Italian Female)', language: 'it-IT', gender: 'Female' as const },
  { id: 'Giorgio', name: 'Giorgio (Italian Male)', language: 'it-IT', gender: 'Male' as const },
  { id: 'Mizuki', name: 'Mizuki (Japanese Female)', language: 'ja-JP', gender: 'Female' as const },
  { id: 'Takumi', name: 'Takumi (Japanese Male)', language: 'ja-JP', gender: 'Male' as const },
  { id: 'Seoyeon', name: 'Seoyeon (Korean Female)', language: 'ko-KR', gender: 'Female' as const },
  { id: 'Zhiyu', name: 'Zhiyu (Chinese Female)', language: 'zh-CN', gender: 'Female' as const },
  { id: 'Vitoria', name: 'Vitória (Portuguese BR Female)', language: 'pt-BR', gender: 'Female' as const },
  { id: 'Ricardo', name: 'Ricardo (Portuguese BR Male)', language: 'pt-BR', gender: 'Male' as const },
  { id: 'Ines', name: 'Inês (Portuguese PT Female)', language: 'pt-PT', gender: 'Female' as const },
  { id: 'Cristiano', name: 'Cristiano (Portuguese PT Male)', language: 'pt-PT', gender: 'Male' as const },
  { id: 'Tatyana', name: 'Tatyana (Russian Female)', language: 'ru-RU', gender: 'Female' as const },
  { id: 'Maxim', name: 'Maxim (Russian Male)', language: 'ru-RU', gender: 'Male' as const },
];

export const DEFAULT_CLOUD_VOICE = 'Brian';

// Current audio element for playback
let currentAudio: HTMLAudioElement | null = null;

/**
 * Voice interface matching the browser TTS service
 */
export interface CloudTTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'Male' | 'Female' | 'Unknown';
}

/**
 * Get available StreamElements voices for UI
 */
export function getCloudVoices(): CloudTTSVoice[] {
  return STREAMELEMENTS_VOICES.map(v => ({
    id: v.id,
    name: v.name,
    language: v.language,
    gender: v.gender,
  }));
}

/**
 * Group cloud voices by language for UI display
 */
export function getCloudVoicesGroupedByLanguage(): Record<string, CloudTTSVoice[]> {
  const voices = getCloudVoices();
  const groups: Record<string, CloudTTSVoice[]> = {};
  
  const languageNames: Record<string, string> = {
    'en-GB': 'English (UK)',
    'en-US': 'English (US)',
    'en-AU': 'English (AU)',
    'en-GB-WLS': 'English (Welsh)',
    'fr-FR': 'French',
    'de-DE': 'German',
    'es-ES': 'Spanish (Spain)',
    'es-US': 'Spanish (US)',
    'it-IT': 'Italian',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'zh-CN': 'Chinese',
    'pt-BR': 'Portuguese (BR)',
    'pt-PT': 'Portuguese (PT)',
    'ru-RU': 'Russian',
  };
  
  for (const voice of voices) {
    const langName = languageNames[voice.language] || voice.language;
    if (!groups[langName]) {
      groups[langName] = [];
    }
    groups[langName].push(voice);
  }
  
  return groups;
}

/**
 * Find a cloud voice by ID
 */
export function findCloudVoice(voiceId: string): CloudTTSVoice | null {
  return STREAMELEMENTS_VOICES.find(v => v.id === voiceId) || null;
}

// Track current object URL for cleanup
let currentObjectUrl: string | null = null;

/**
 * Internal async function to handle the TTS playback
 */
async function doPlayCloudTTS(
  text: string,
  voiceId: string,
  volume: number,
  cancelledRef: { value: boolean }
): Promise<void> {
  if (!text || text.trim().length === 0) {
    return;
  }

  if (cancelledRef.value) {
    return;
  }

  // Validate voice exists, fallback to default
  const voice = findCloudVoice(voiceId);
  const finalVoiceId = voice ? voiceId : DEFAULT_CLOUD_VOICE;
  
  if (!voice) {
    warn(`[CloudTTS] Voice "${voiceId}" not found, using ${DEFAULT_CLOUD_VOICE}`);
  }

  info(`[CloudTTS] Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" with voice: ${finalVoiceId}`);

  // Build the proxy URL
  const url = `${TTS_PROXY_URL}?voice=${encodeURIComponent(finalVoiceId)}&text=${encodeURIComponent(text)}`;
  
  // Fetch the audio as blob to avoid CORS issues
  info('[CloudTTS] Fetching audio from API...');
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const blob = await response.blob();
  info(`[CloudTTS] Received audio blob: ${blob.size} bytes, type: ${blob.type}`);
  
  if (cancelledRef.value) {
    return;
  }
  
  // Create object URL from blob
  const objectUrl = URL.createObjectURL(blob);
  currentObjectUrl = objectUrl;
  
  // Create audio element with blob URL
  const audio = new Audio(objectUrl);
  currentAudio = audio;
  audio.volume = Math.max(0, Math.min(1, volume));
  
  // Wait for playback to complete
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      info('[CloudTTS] Playback finished');
      currentAudio = null;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
      resolve();
    };
    
    audio.onerror = (e) => {
      logError('[CloudTTS] Audio playback error:', e);
      currentAudio = null;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
      reject(new Error('Failed to play TTS audio'));
    };
    
    // Play the audio
    info('[CloudTTS] Playing audio...');
    audio.play().catch((err) => {
      // Ignore "AbortError" - this happens when React re-renders during playback
      // but the audio still plays successfully
      if (err.name === 'AbortError') {
        info('[CloudTTS] Play interrupted by re-render (audio still playing)');
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Play TTS using StreamElements cloud API
 * Uses fetch + blob to avoid CORS issues with Audio element src
 * 
 * @param text - Text to speak
 * @param voiceId - StreamElements voice ID (e.g., 'Brian', 'Amy')
 * @param volume - Volume level (0-1)
 * @returns Object with promise and cancel function
 */
export function playCloudTTS(
  text: string,
  voiceId: string = DEFAULT_CLOUD_VOICE,
  volume: number = 1
): { promise: Promise<void>; cancel: () => void } {
  const cancelledRef = { value: false };
  
  // Stop any currently playing audio and clean up
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  const promise = doPlayCloudTTS(text, voiceId, volume, cancelledRef).catch((err) => {
    logError('[CloudTTS] Error:', err);
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    throw err;
  });

  const cancel = () => {
    cancelledRef.value = true;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    info('[CloudTTS] Playback cancelled');
  };

  return { promise, cancel };
}

/**
 * Test a cloud voice by speaking a sample
 */
export function testCloudVoice(voiceId: string, volume: number = 1): { promise: Promise<void>; cancel: () => void } {
  return playCloudTTS("Testing voice", voiceId, volume);
}
