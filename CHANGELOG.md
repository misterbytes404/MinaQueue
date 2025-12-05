# Changelog

All notable changes to MinaQueue will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned
- Twitch OAuth authentication
- Security features (whitelist, session management)
- Persistent alert image storage
- Railway/Render deployment testing

---

## [0.1.0] - 2025-12-05

### Added
- **Gate Control** - One-click pause/resume for TTS alerts
- **Queue System** - Alerts queue silently when gate is closed
- **Amazon Polly TTS** - Cloud-based text-to-speech with Brian as default voice
- **WebSocket Server** - Real-time sync between dashboard and OBS overlay
- **Overlay Customization** - Colors, fonts, images, and alert duration
- **Volume Sync** - Volume slider syncs from dashboard to OBS overlay
- **StreamElements Integration** - JWT token authentication for receiving Cheer alerts
- **OBS Browser Source** - Dedicated overlay mode for streaming

### Changed
- Switched from StreamElements TTS to Amazon Polly (more reliable, consistent voice)
- Simplified provider setup to StreamElements-only
- Removed browser/cloud TTS toggle (cloud-only now)
- Updated README with professional styling and badges

### Removed
- Streamlabs integration (unused, never tested)
- `AuthCallback.tsx` component (Streamlabs OAuth only)
- `useTTSQueue.ts` hook (unused)
- `useVoices.ts` hook (unused)
- Browser TTS fallback (cloud-only now)
- Test MP3 files (cleanup)

### Fixed
- Volume slider now properly syncs to OBS overlay
- TTS voice selection persists correctly
- Default voice (Brian) applied consistently across dashboard and overlay

### Security
- AWS credentials stored in `.env` file (gitignored)
- No secrets committed to repository

---

## [0.0.1] - 2025-12-03

### Added
- Initial project setup
- React 19 + TypeScript + Vite
- Tailwind CSS v4 styling
- Zustand state management
- Basic queue management UI
- StreamElements WebSocket connection

---

[Unreleased]: https://github.com/misterbytes404/MinaQueue/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/misterbytes404/MinaQueue/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/misterbytes404/MinaQueue/releases/tag/v0.0.1
