import { useRef, useState } from 'react';
import { Upload, Palette, Type, Image as ImageIcon, Copy, Check, Eye, FlaskConical, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AlertDisplay } from './AlertDisplay';
import type { QueueItem } from '../types';

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

/**
 * Dedicated Overlay Settings Page
 * Opens in a new tab for configuring the OBS overlay appearance
 */
export function OverlaySettingsPage() {
  const { settings, updateOverlaySettings } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateOverlaySettings({ alertImageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    updateOverlaySettings({ alertImageUrl: null });
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
          <a 
            href="/"
            className="px-4 py-2 bg-cerber-violet/20 text-cerber-violet border border-cerber-violet/50 rounded-lg hover:bg-cerber-violet/30 transition-colors"
          >
            ← Back to Dashboard
          </a>
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
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
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
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm bg-bone-white/10 hover:bg-bone-white/20 rounded-lg transition-colors"
                    >
                      Change Image
                    </button>
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
                      onChange={(e) => updateOverlaySettings({ alertImageSize: parseInt(e.target.value) })}
                      className="w-full accent-cerber-violet"
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-8 border-2 border-dashed border-bone-white/30 rounded-lg hover:border-cerber-violet/50 transition-colors flex flex-col items-center gap-3"
                >
                  <Upload className="w-10 h-10 text-bone-white/40" />
                  <span className="text-bone-white/60">Click to upload image or GIF</span>
                  <span className="text-xs text-bone-white/40">PNG, JPG, GIF supported</span>
                </button>
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
                    onChange={(e) => updateOverlaySettings({ fontFamily: e.target.value })}
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
                    onChange={(e) => updateOverlaySettings({ fontSize: parseInt(e.target.value) })}
                    className="w-full accent-cerber-violet mt-2"
                  />
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
                      onChange={(e) => updateOverlaySettings({ usernameColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.usernameColor}
                      onChange={(e) => updateOverlaySettings({ usernameColor: e.target.value })}
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
                      onChange={(e) => updateOverlaySettings({ amountColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.amountColor}
                      onChange={(e) => updateOverlaySettings({ amountColor: e.target.value })}
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
                      onChange={(e) => updateOverlaySettings({ messageColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.messageColor}
                      onChange={(e) => updateOverlaySettings({ messageColor: e.target.value })}
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
                      onChange={(e) => updateOverlaySettings({ alertBorderColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.alertBorderColor}
                      onChange={(e) => updateOverlaySettings({ alertBorderColor: e.target.value })}
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
                      onChange={(e) => updateOverlaySettings({ alertBackgroundColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={settings.overlay.alertBackgroundColor}
                      onChange={(e) => updateOverlaySettings({ alertBackgroundColor: e.target.value })}
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
                    onChange={(e) => updateOverlaySettings({ showAmount: e.target.checked })}
                    className="w-5 h-5 accent-cerber-violet rounded"
                  />
                  <span className="text-bone-white">Show amount (bits/donation)</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.overlay.showMessage}
                    onChange={(e) => updateOverlaySettings({ showMessage: e.target.checked })}
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
                  onChange={(e) => updateOverlaySettings({ alertDuration: parseInt(e.target.value) })}
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
