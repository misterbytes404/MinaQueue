import { useRef, useState, useEffect } from 'react';
import { Upload, Palette, Type, Image as ImageIcon, Copy, Check, Eye, FlaskConical, X, Save, Wifi, WifiOff, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AlertDisplay } from './AlertDisplay';
import type { QueueItem, OverlaySettings } from '../types';
import { info, error as logError } from '../lib/logger';
import { playCloudTTS, getCloudVoicesGroupedByLanguage, DEFAULT_CLOUD_VOICE } from '../services/cloud-tts';

// IndexedDB helper for storing large images
const DB_NAME = 'minaqueue-images';
const STORE_NAME = 'images';
const IMAGE_KEY = 'alert-image';

async function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveImageToDB(dataUrl: string): Promise<void> {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(dataUrl, IMAGE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

async function loadImageFromDB(): Promise<string | null> {
  try {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(IMAGE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function deleteImageFromDB(): Promise<void> {
  try {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(IMAGE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Ignore errors when deleting
  }
}

const FONT_OPTIONS = [
  'Segoe UI',
  'Arial',
  'Comic Sans MS',
  'Georgia',
  'Impact',
  'Trebuchet MS',
  'Verdana',
  'Courier New',
  'Palatino Linotype',
  'Lucida Console',
];

interface OverlaySettingsPageProps {
  wsConnected: boolean;
  onSendSettings: (settings: OverlaySettings) => void;
}

/**
 * Dedicated Overlay Settings Page
 * Opens in a new tab for configuring the OBS overlay appearance
 */
export function OverlaySettingsPage({ wsConnected, onSendSettings }: OverlaySettingsPageProps) {
  const { settings, updateOverlaySettings } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [voiceTestPlaying, setVoiceTestPlaying] = useState(false);

  // Group cloud voices by language for the dropdown
  const voiceGroups = getCloudVoicesGroupedByLanguage();

  // Load image from IndexedDB on mount (handles large GIFs that can't fit in localStorage)
  useEffect(() => {
    async function loadStoredImage() {
      // First check IndexedDB
      const dbImage = await loadImageFromDB();
      if (dbImage && !settings.overlay.alertImageUrl) {
        info('[Settings] Restoring image from IndexedDB');
        updateOverlaySettings({ alertImageUrl: dbImage });
        return;
      }
      
      // Fallback to old localStorage key for migration
      const storedImage = localStorage.getItem('minaqueue-alert-image');
      if (storedImage && !settings.overlay.alertImageUrl) {
        info('[Settings] Migrating image from localStorage to IndexedDB');
        updateOverlaySettings({ alertImageUrl: storedImage });
        // Migrate to IndexedDB and remove from localStorage
        try {
          await saveImageToDB(storedImage);
          localStorage.removeItem('minaqueue-alert-image');
        } catch (e) {
          logError('[Settings] Failed to migrate image to IndexedDB:', e);
        }
      }
    }
    loadStoredImage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track changes
  const handleSettingChange = <T,>(updater: () => T) => {
    updater();
    setHasUnsavedChanges(true);
    setSaved(false);
  };

  // Broadcast settings on initial connect
  useEffect(() => {
    if (wsConnected) {
      info('[Settings] Connected to overlay server, broadcasting settings');
      onSendSettings(settings.overlay);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected]);

  const handleSave = () => {
    if (wsConnected) {
      info('[Settings] Broadcasting settings to overlay, alertImageUrl:', settings.overlay.alertImageUrl ? 'present (' + settings.overlay.alertImageUrl.length + ' chars)' : 'null');
      onSendSettings(settings.overlay);
      setSaved(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      info('[Settings] No file selected');
      return;
    }

    info('[Settings] File selected:', file.name, file.type, file.size);

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Increased limit to 10MB for GIFs (IndexedDB can handle much more)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please use an image under 10MB.\n\nTip: Use a tool like ezgif.com to compress large GIFs.');
      return;
    }

    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      info('[Settings] Image loaded, data URL length:', dataUrl.length);
      
      try {
        // Store in IndexedDB (handles large files much better than localStorage)
        await saveImageToDB(dataUrl);
        info('[Settings] Image saved to IndexedDB');
        handleSettingChange(() => updateOverlaySettings({ alertImageUrl: dataUrl }));
      } catch (err) {
        logError('[Settings] Failed to save image:', err);
        alert('Failed to save image. Please try a smaller file.');
      } finally {
        setImageLoading(false);
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file');
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    handleSettingChange(() => updateOverlaySettings({ alertImageUrl: null }));
    // Clean up from both IndexedDB and old localStorage
    await deleteImageFromDB();
    localStorage.removeItem('minaqueue-alert-image');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/overlay`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreview = () => {
    setPreviewItem({
      id: 'preview-' + Date.now(),
      username: 'TestViewer',
      amount: 500,
      message: 'This is a preview of how your alert will look!',
      timestamp: Date.now(),
      status: 'playing',
      type: 'bits',
    });
  };

  const handlePreviewComplete = () => {
    setPreviewItem(null);
  };

  const overlayUrl = `${window.location.origin}/overlay`;

  return (
    <div className="min-h-screen bg-bg-void text-bone-white">
      {/* Header */}
      <header className="bg-bg-void/80 border-b border-bone-white/20 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦴</span>
            <div>
              <h1 className="text-xl font-bold text-bone-white">Overlay Settings</h1>
              <p className="text-sm text-bone-white/60">Customize your OBS alert appearance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              wsConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {wsConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!wsConnected}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : wsConnected
                    ? hasUnsavedChanges
                      ? 'bg-squeaky-pink text-bg-void hover:bg-squeaky-pink/90'
                      : 'bg-cerber-violet/20 text-cerber-violet border border-cerber-violet/50 hover:bg-cerber-violet/30'
                    : 'bg-bone-white/10 text-bone-white/40 border border-bone-white/20 cursor-not-allowed'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : hasUnsavedChanges ? 'Save Changes' : 'Save'}
            </button>
            
            <a 
              href="/"
              className="px-4 py-2 bg-cerber-violet/20 text-cerber-violet border border-cerber-violet/50 rounded-lg hover:bg-cerber-violet/30 transition-colors"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Column */}
          <div className="space-y-6">
            {/* OBS URL Section */}
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Copy className="w-5 h-5 text-cerber-violet" />
                OBS Browser Source URL
              </h2>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-bg-void rounded-lg text-sm text-cerber-violet break-all border border-bone-white/20">
                  {overlayUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    copied 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                      : 'bg-cerber-violet/20 text-cerber-violet border border-cerber-violet/50 hover:bg-cerber-violet/30'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-bone-white/50 mt-2">
                Add this URL as a Browser Source in OBS. Set size to 1920x1080 for best results.
              </p>
            </div>

            {/* Alert Image/GIF */}
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cerber-violet" />
                Alert Image / GIF
              </h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="alert-image-upload"
              />
              
              {settings.overlay.alertImageUrl ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={settings.overlay.alertImageUrl}
                      alt="Alert preview"
                      className="max-w-[200px] max-h-[200px] rounded-lg border border-bone-white/30"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-hellfire-red rounded-full flex items-center justify-center text-white text-lg font-bold hover:bg-hellfire-red/80"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <label
                      htmlFor="alert-image-upload"
                      className="px-3 py-1.5 text-sm bg-bone-white/10 hover:bg-bone-white/20 rounded-lg transition-colors cursor-pointer"
                    >
                      Change Image
                    </label>
                  </div>
                  
                  {/* Image Size */}
                  <div>
                    <label className="block text-sm text-bone-white/70 mb-1">
                      Image Size: {settings.overlay.alertImageSize}px
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={settings.overlay.alertImageSize}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ alertImageSize: parseInt(e.target.value) }))}
                      className="w-full accent-cerber-violet"
                    />
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="alert-image-upload"
                  className={`w-full px-4 py-8 border-2 border-dashed border-bone-white/30 rounded-lg hover:border-cerber-violet/50 transition-colors flex flex-col items-center gap-3 cursor-pointer ${imageLoading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {imageLoading ? (
                    <>
                      <div className="w-10 h-10 border-4 border-cerber-violet/30 border-t-cerber-violet rounded-full animate-spin" />
                      <span className="text-bone-white/60">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-bone-white/40" />
                      <span className="text-bone-white/60">Click to upload image or GIF</span>
                      <span className="text-xs text-bone-white/40">PNG, JPG, GIF supported (max 10MB)</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Font Settings */}
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-cerber-violet" />
                Text Styling
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Font Family */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">Font Family</label>
                  <select
                    value={settings.overlay.fontFamily}
                    onChange={(e) => handleSettingChange(() => updateOverlaySettings({ fontFamily: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-void border border-bone-white/30 text-bone-white focus:border-cerber-violet focus:outline-none"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Font Size */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">
                    Font Size: {settings.overlay.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={settings.overlay.fontSize}
                    onChange={(e) => handleSettingChange(() => updateOverlaySettings({ fontSize: parseInt(e.target.value) }))}
                    className="w-full accent-cerber-violet mt-2"
                  />
                </div>
              </div>
            </div>

            {/* TTS Voice Settings */}
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-cerber-violet" />
                TTS Voice
              </h2>
              
              <div className="space-y-4">
                {/* Voice Selection */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">Voice</label>
                  <select
                    value={settings.overlay.ttsVoice || DEFAULT_CLOUD_VOICE}
                    onChange={(e) => handleSettingChange(() => updateOverlaySettings({ ttsVoice: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-bg-void border border-bone-white/30 text-bone-white focus:border-cerber-violet focus:outline-none"
                  >
                    {Object.entries(voiceGroups).map(([language, voices]) => (
                      <optgroup key={language} label={language}>
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} ({voice.gender})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                {/* Volume Slider */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">
                    Volume: {Math.round((settings.overlay.ttsVolume ?? 1) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.overlay.ttsVolume ?? 1}
                    onChange={(e) => handleSettingChange(() => updateOverlaySettings({ ttsVolume: parseFloat(e.target.value) }))}
                    className="w-full accent-cerber-violet"
                  />
                </div>
                
                {/* Test Voice Button */}
                <div>
                  <button
                    onClick={() => {
                      if (voiceTestPlaying) return;
                      setVoiceTestPlaying(true);
                      const voice = settings.overlay.ttsVoice || DEFAULT_CLOUD_VOICE;
                      const volume = settings.overlay.ttsVolume ?? 1;
                      playCloudTTS('Hello! This is a test of the text to speech voice.', voice, volume)
                        .promise
                        .finally(() => setVoiceTestPlaying(false));
                    }}
                    disabled={voiceTestPlaying}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      voiceTestPlaying
                        ? 'bg-bone-white/10 text-bone-white/50 cursor-not-allowed'
                        : 'bg-cerber-violet/20 text-cerber-violet border border-cerber-violet/50 hover:bg-cerber-violet/30'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    {voiceTestPlaying ? 'Playing...' : 'Test Voice'}
                  </button>
                  <p className="text-xs text-bone-white/50 mt-2">
                    Uses Amazon Polly for consistent TTS in dashboard and OBS
                  </p>
                </div>
              </div>
            </div>

            {/* Color Settings */}
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-cerber-violet" />
                Colors
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Username Color */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">Username</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.overlay.usernameColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ usernameColor: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.usernameColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ usernameColor: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded bg-bg-void border border-bone-white/30 text-bone-white text-sm"
                    />
                  </div>
                </div>
                
                {/* Amount Color */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">Amount</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.overlay.amountColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ amountColor: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.amountColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ amountColor: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded bg-bg-void border border-bone-white/30 text-bone-white text-sm"
                    />
                  </div>
                </div>
                
                {/* Message Color */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">Message</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.overlay.messageColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ messageColor: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.messageColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ messageColor: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded bg-bg-void border border-bone-white/30 text-bone-white text-sm"
                    />
                  </div>
                </div>
                
                {/* Border Color */}
                <div>
                  <label className="block text-sm text-bone-white/70 mb-2">Border</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.overlay.alertBorderColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ alertBorderColor: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.alertBorderColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ alertBorderColor: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded bg-bg-void border border-bone-white/30 text-bone-white text-sm"
                    />
                  </div>
                </div>
                
                {/* Background Color */}
                <div className="col-span-2">
                  <label className="block text-sm text-bone-white/70 mb-2">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.overlay.alertBackgroundColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ alertBackgroundColor: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.alertBackgroundColor}
                      onChange={(e) => handleSettingChange(() => updateOverlaySettings({ alertBackgroundColor: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded bg-bg-void border border-bone-white/30 text-bone-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Display Options</h2>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.overlay.showAmount}
                    onChange={(e) => handleSettingChange(() => updateOverlaySettings({ showAmount: e.target.checked }))}
                    className="w-5 h-5 accent-cerber-violet rounded"
                  />
                  <span className="text-bone-white">Show amount (bits/donation)</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.overlay.showMessage}
                    onChange={(e) => handleSettingChange(() => updateOverlaySettings({ showMessage: e.target.checked }))}
                    className="w-5 h-5 accent-cerber-violet rounded"
                  />
                  <span className="text-bone-white">Show message text</span>
                </label>
              </div>
              
              {/* Alert Duration */}
              <div className="mt-4">
                <label className="block text-sm text-bone-white/70 mb-2">
                  Alert Duration: {(settings.overlay.alertDuration / 1000).toFixed(1)} seconds
                </label>
                <input
                  type="range"
                  min="2000"
                  max="15000"
                  step="500"
                  value={settings.overlay.alertDuration}
                  onChange={(e) => handleSettingChange(() => updateOverlaySettings({ alertDuration: parseInt(e.target.value) }))}
                  className="w-full accent-cerber-violet"
                />
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-bone-white/5 border border-bone-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cerber-violet" />
                  Live Preview
                </h2>
                <div className="flex gap-2">
                  {previewItem && (
                    <button
                      onClick={handlePreviewComplete}
                      className="px-4 py-2 bg-hellfire-red/20 text-hellfire-red border border-hellfire-red/50 rounded-lg hover:bg-hellfire-red/30 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Close
                    </button>
                  )}
                  <button
                    onClick={handlePreview}
                    className="px-4 py-2 bg-squeaky-pink/20 text-squeaky-pink border border-squeaky-pink/50 rounded-lg hover:bg-squeaky-pink/30 transition-colors flex items-center gap-2"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Test Alert
                  </button>
                </div>
              </div>
              
              {/* Preview Area */}
              <div 
                className="relative rounded-lg overflow-hidden"
                style={{ 
                  backgroundColor: '#18181b', // Simulating OBS dark background
                  aspectRatio: '16/9',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'10\' height=\'10\' fill=\'%23222\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23222\'/%3E%3C/svg%3E")',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {previewItem ? (
                    <AlertDisplay 
                      item={previewItem} 
                      onAlertComplete={handlePreviewComplete}
                      settings={settings.overlay}
                      clickToClose={true}
                    />
                  ) : (
                    <div className="text-bone-white/30 text-center">
                      <p className="text-sm">Click "Test Alert" to preview</p>
                      <p className="text-xs mt-1">Click the alert to close it</p>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-bone-white/50 mt-3 text-center">
                Checkered background simulates OBS transparency
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

