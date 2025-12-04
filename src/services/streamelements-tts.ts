/**
 * TTS Service
 * 
 * Uses browser Web Speech API (speechSynthesis) for text-to-speech.
 * This provides access to system voices which vary by OS:
 * 
 * - Windows: Microsoft voices (David, Zira, Mark, etc.) + any installed voices
 * - macOS: High-quality voices (Samantha, Alex, etc.)
 * - Chrome: Includes Google voices (US English, UK English, etc.)
 * 
 * To get more/better voices on Windows:
 * Settings > Time & Language > Speech > Manage voices > Add voices
 */

import { info, warn, error as logError } from '../lib/logger';

// JWT token (kept for potential future use, but not used for browser TTS)
let jwtToken: string | null = null;

/**
 * Set the JWT token (kept for API compatibility)
 */
export function setTTSToken(token: string | null) {
  jwtToken = token;
  info('[TTS] Token set:', token ? 'present' : 'null');
}

// Voice interface for UI
export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'Male' | 'Female' | 'Unknown';
}

// Default voice - will use system default if not found
export const DEFAULT_TTS_VOICE = 'default';

// Cache for system voices
let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * Get available system voices
 */
export function getSystemVoices(): SpeechSynthesisVoice[] {
  // Always try to get fresh voices if cache is empty
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

/**
 * Initialize voices (call this early, voices load async in some browsers)
 */
export function initVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }
    
    // Chrome loads voices async
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    
    // Timeout fallback
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 1000);
  });
}

/**
 * Convert system voices to our TTSVoice format for UI
 * Uses voice.name as ID for better cross-browser compatibility
 */
export function getVoicesForUI(): TTSVoice[] {
  const systemVoices = getSystemVoices();
  
  // Add a "default" option
  const voices: TTSVoice[] = [
    { id: 'default', name: 'System Default', language: 'en', gender: 'Unknown' }
  ];
  
  for (const voice of systemVoices) {
    // Try to determine gender from voice name (not always accurate)
    let gender: 'Male' | 'Female' | 'Unknown' = 'Unknown';
    const nameLower = voice.name.toLowerCase();
    if (nameLower.includes('female') || nameLower.includes('zira') || 
        nameLower.includes('samantha') || nameLower.includes('victoria') ||
        nameLower.includes('karen') || nameLower.includes('moira') ||
        nameLower.includes('tessa') || nameLower.includes('fiona')) {
      gender = 'Female';
    } else if (nameLower.includes('male') || nameLower.includes('david') ||
               nameLower.includes('mark') || nameLower.includes('alex') ||
               nameLower.includes('daniel') || nameLower.includes('oliver')) {
      gender = 'Male';
    }
    
    // Use voice.name as ID for cross-browser compatibility
    // voiceURI can differ between Chrome, OBS, etc.
    voices.push({
      id: voice.name,
      name: voice.name,
      language: voice.lang,
      gender,
    });
  }
  
  return voices;
}

/**
 * Group voices by language for UI display
 */
export function getVoicesGroupedByLanguage(): Record<string, TTSVoice[]> {
  const voices = getVoicesForUI();
  const groups: Record<string, TTSVoice[]> = {
    'Default': [voices[0]], // System default
  };
  
  for (let i = 1; i < voices.length; i++) {
    const voice = voices[i];
    const langCode = voice.language.split('-')[0].toUpperCase();
    const langName = getLanguageName(voice.language) || langCode;
    
    if (!groups[langName]) {
      groups[langName] = [];
    }
    groups[langName].push(voice);
  }
  
  return groups;
}

function getLanguageName(code: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'en-AU': 'English (Australia)',
    'es': 'Spanish',
    'es-ES': 'Spanish (Spain)',
    'es-MX': 'Spanish (Mexico)',
    'fr': 'French',
    'fr-FR': 'French (France)',
    'de': 'German',
    'de-DE': 'German',
    'it': 'Italian',
    'it-IT': 'Italian',
    'ja': 'Japanese',
    'ja-JP': 'Japanese',
    'ko': 'Korean',
    'ko-KR': 'Korean',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'ru': 'Russian',
    'ru-RU': 'Russian',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
  };
  
  return languageMap[code] || languageMap[code.split('-')[0]] || code;
}

/**
 * Find a voice by ID (voiceURI) or name
 * Tries multiple matching strategies since voiceURI can differ between browsers
 */
export function findVoice(voiceId: string): SpeechSynthesisVoice | null {
  if (voiceId === 'default' || !voiceId) {
    return null; // Use browser default
  }
  
  const voices = getSystemVoices();
  
  if (voices.length === 0) {
    warn('[TTS] No voices available yet');
    return null;
  }
  
  // First try exact voiceURI match
  let voice = voices.find(v => v.voiceURI === voiceId);
  if (voice) {
    info(`[TTS] Found voice by voiceURI: ${voice.name}`);
    return voice;
  }
  
  // Try matching by voice name (more portable across browsers)
  voice = voices.find(v => v.name === voiceId);
  if (voice) {
    info(`[TTS] Found voice by name: ${voice.name}`);
    return voice;
  }
  
  // Try partial name match (e.g., "Google UK English Male" might be stored differently)
  voice = voices.find(v => v.name.includes(voiceId) || voiceId.includes(v.name));
  if (voice) {
    info(`[TTS] Found voice by partial match: ${voice.name}`);
    return voice;
  }
  
  // Try matching just the key part of the name (e.g., "UK English Male")
  const simplifiedId = voiceId.replace(/^(Google|Microsoft|Apple)\s+/i, '');
  voice = voices.find(v => {
    const simplifiedName = v.name.replace(/^(Google|Microsoft|Apple)\s+/i, '');
    return simplifiedName === simplifiedId || simplifiedName.includes(simplifiedId);
  });
  if (voice) {
    info(`[TTS] Found voice by simplified match: ${voice.name}`);
    return voice;
  }
  
  // Try to find a voice with similar characteristics (language/gender)
  // Extract language and gender hints from the voice ID
  const idLower = voiceId.toLowerCase();
  const wantsMale = idLower.includes('male') || idLower.includes('david') || idLower.includes('mark') || idLower.includes('daniel');
  const wantsFemale = idLower.includes('female') || idLower.includes('zira') || idLower.includes('samantha') || idLower.includes('karen');
  const wantsUK = idLower.includes('uk') || idLower.includes('british') || idLower.includes('gb');
  
  // Find best alternative voice
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  if (englishVoices.length > 0) {
    // Prefer matching gender if specified
    if (wantsMale) {
      const maleVoice = englishVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('male') || n.includes('david') || n.includes('mark') || n.includes('daniel') || n.includes('james') || n.includes('george');
      });
      if (maleVoice) {
        info(`[TTS] Using fallback male voice: ${maleVoice.name} (requested: ${voiceId})`);
        return maleVoice;
      }
    }
    if (wantsFemale) {
      const femaleVoice = englishVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('female') || n.includes('zira') || n.includes('samantha') || n.includes('karen') || n.includes('susan') || n.includes('hazel');
      });
      if (femaleVoice) {
        info(`[TTS] Using fallback female voice: ${femaleVoice.name} (requested: ${voiceId})`);
        return femaleVoice;
      }
    }
    
    // Prefer UK if requested
    if (wantsUK) {
      const ukVoice = englishVoices.find(v => v.lang.includes('GB') || v.name.toLowerCase().includes('uk') || v.name.toLowerCase().includes('british'));
      if (ukVoice) {
        info(`[TTS] Using fallback UK voice: ${ukVoice.name} (requested: ${voiceId})`);
        return ukVoice;
      }
    }
    
    // Just use first English voice
    info(`[TTS] Using fallback English voice: ${englishVoices[0].name} (requested: ${voiceId})`);
    return englishVoices[0];
  }
  
  // Last resort: use first available voice
  if (voices.length > 0) {
    info(`[TTS] Using first available voice: ${voices[0].name} (requested: ${voiceId})`);
    return voices[0];
  }
  
  warn(`[TTS] Voice not found: "${voiceId}". Available: ${voices.map(v => v.name).slice(0, 5).join(', ')}...`);
  return null;
}

/**
 * Play TTS using browser speechSynthesis
 * @param text - Text to speak
 * @param voiceId - Voice URI or 'default'
 * @param volume - Volume level (0-1)
 * @returns Object with promise and cancel function
 */
export function playTTS(
  text: string,
  voiceId: string = DEFAULT_TTS_VOICE,
  volume: number = 1
): { promise: Promise<void>; cancel: () => void } {
  let cancelled = false;
  let resumeInterval: number | null = null;

  const promise = new Promise<void>((resolve, reject) => {
    if (!text || text.trim().length === 0) {
      resolve();
      return;
    }

    if (cancelled) {
      resolve();
      return;
    }

    // Ensure voices are loaded before speaking
    initVoices().then(() => {
      if (cancelled) {
        resolve();
        return;
      }
      
      info(`[TTS] Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" with voice: ${voiceId}`);

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = Math.max(0, Math.min(1, volume));
      
      // Set voice if specified
      const voice = findVoice(voiceId);
      if (voice) {
        utterance.voice = voice;
        info(`[TTS] Using voice: ${voice.name}`);
      } else {
        info('[TTS] Using system default voice');
      }

      let speechStarted = false;
      
      utterance.onstart = () => {
        info('[TTS] Speech started (onstart fired)');
        speechStarted = true;
      };

      utterance.onend = () => {
        if (resumeInterval) clearInterval(resumeInterval);
        info('[TTS] Playback finished');
        resolve();
      };

      utterance.onerror = (event) => {
        if (resumeInterval) clearInterval(resumeInterval);
        if (event.error === 'canceled' || cancelled) {
          resolve(); // Cancelled is not an error
        } else if (event.error === 'not-allowed') {
          // Browser blocked audio - need user interaction first
          logError('[TTS] Audio blocked by browser - click somewhere to enable');
          resolve();
        } else {
          logError('[TTS] Speech error:', event.error);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      // Chrome bug workaround: speech can stop mid-sentence on long text
      resumeInterval = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          if (resumeInterval) clearInterval(resumeInterval);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      // Ensure speechSynthesis is ready
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      
      window.speechSynthesis.speak(utterance);
      info('[TTS] Playback started, speaking:', window.speechSynthesis.speaking, 'pending:', window.speechSynthesis.pending);
      
      // Mark as started if speaking began immediately (onstart may not fire in all browsers)
      if (window.speechSynthesis.speaking) {
        speechStarted = true;
      }
      
      // If speech doesn't start within 500ms, something is wrong
      setTimeout(() => {
        if (!speechStarted && !cancelled && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          logError('[TTS] Speech did not start - browser may be blocking audio');
        }
      }, 500);
    });
  });

  const cancel = () => {
    cancelled = true;
    if (resumeInterval) clearInterval(resumeInterval);
    window.speechSynthesis.cancel();
    info('[TTS] Playback cancelled');
  };

  return { promise, cancel };
}

/**
 * Test a voice by speaking a sample
 */
export function testVoice(voiceId: string, volume: number = 1): { promise: Promise<void>; cancel: () => void } {
  return playTTS("Hello! This is a test of the text to speech voice.", voiceId, volume);
}

// Legacy export for compatibility
export { jwtToken };

// Initialize voices on module load
if (typeof window !== 'undefined') {
  initVoices();
}
