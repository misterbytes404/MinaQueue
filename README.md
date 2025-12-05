<div align="center">

# 🦴 MinaQueue

**A TTS Queue Manager for Streamers**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Amazon Polly](https://img.shields.io/badge/Amazon_Polly-TTS-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/polly/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

*Pause and queue Cheer alerts during important stream moments*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Configuration](#-configuration) • [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚪 **Gate Control** | One-click pause/resume for all TTS alerts |
| 📋 **Queue System** | Alerts queue silently until you're ready |
| 🎤 **Cloud TTS** | Consistent voice across browser and OBS (Amazon Polly) |
| 🎨 **Customizable** | Colors, fonts, images, and alert duration |
| 🔄 **Real-time Sync** | Dashboard and overlay stay in sync via WebSocket |

---

## 🚀 Installation

### Option A: Hosted Version

> ⚠️ **Untested** - See Developer Notes for hosting instructions

If someone is hosting MinaQueue for you:

1. **Dashboard URL** - e.g., `https://minaqueue.yourname.app`
2. **Overlay URL** - Dashboard URL + `/overlay`

Skip to [Usage](#-usage) section.

---

### Option B: Local Setup

**Requirements:**

- Windows 10/11
- [Node.js LTS](https://nodejs.org/)
- StreamElements account
- OBS Studio
- Amazon AWS account (~$1-3/month, first year mostly free)

#### 1. Install Dependencies

```powershell
npm install -g pnpm
```

#### 2. Clone & Install

```powershell
git clone https://github.com/misterbytes404/MinaQueue.git
cd MinaQueue
pnpm install
```

#### 3. Start the Application

Open two PowerShell windows:

```powershell
# Terminal 1 - Server
pnpm run server

# Terminal 2 - Frontend
pnpm run dev
```

Open `http://localhost:5173`

---

## ⚙️ Configuration

### StreamElements Connection

1. [StreamElements Account Settings](https://streamelements.com/dashboard/account/channels) → **Show secrets**
2. Copy **JWT Token** → Paste in MinaQueue → **Connect**

---

### OBS Browser Source

| Setting | Value |
|---------|-------|
| URL | `http://localhost:5173/overlay` |
| Width | 1920 |
| Height | 1080 |

> Disable existing StreamElements Cheer/Bits alerts to avoid duplicates

---

### Amazon Polly (TTS)

<details>
<summary>Setup Instructions</summary>

#### Pricing

| Usage | Monthly Cost |
|-------|--------------|
| Light (500 alerts) | ~$0.30 |
| Medium (2,000 alerts) | ~$1.20 |
| Heavy (5,000 alerts) | ~$3.00 |

First 12 months: 5 million characters free (~25,000 alerts).

### Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com/)
2. Create an account (requires credit card)

### Create Access Keys

1. Sign into AWS, then go to: [IAM Users](https://console.aws.amazon.com/iam/home#/users)
2. Click **Create user**
3. Name it `minaqueue`, click **Next**
4. Choose **Attach policies directly**
5. Search for `AmazonPollyReadOnlyAccess` and check the box ☑️
6. Click **Next** → **Create user**
7. Click on the user you just created
8. Click the **Security credentials** tab
9. Under "Access keys", click **Create access key**
10. Choose **Application running outside AWS**, click **Next** → **Create access key**
11. **SAVE BOTH KEYS** somewhere safe! You won't see the secret again.

### Add Keys to MinaQueue

1. Copy `.env.example` to `.env`
2. Add your keys:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

3. Restart the server

</details>

---

## 🎮 Usage

### Gate Control

The big button at the top controls whether alerts play:

| State | What Happens |
|-------|--------------|
| 🚪 **OPEN** | Alerts play immediately |
| 🔒 **CLOSED** | Alerts queue silently |

### Queue Management

When the gate is closed, alerts stack up in your queue. You can:

- **▶️ Play** - Play one alert immediately
- **🦴 Bury** - Delete an alert you don't want
- **Clear Played** - Remove alerts that already played

### Settings (⚙️ Gear Icon)

- Set minimum bits (ignore small cheers)
- Add test messages to try things out
- Copy the overlay URL for OBS

---

## 🎨 Customization

| Setting | Location |
|---------|----------|
| Alert image, colors, font | `http://localhost:5173/overlay-settings` |
| TTS voice, volume | Dashboard footer |

---

### Available TTS Voices

| Voice | Accent | Sound |
|-------|--------|-------|
| **Brian** | British | Male, professional |
| **Amy** | British | Female, clear |
| **Emma** | British | Female, warm |
| **Joanna** | American | Female, friendly |
| **Matthew** | American | Male, natural |
| **Joey** | American | Male, casual |
| **Kendra** | American | Female, confident |
| **Ivy** | American | Female child |

---

## ❓ Troubleshooting

### "Connection Failed"

- Make sure you copied the ENTIRE JWT token from StreamElements
- Try refreshing StreamElements and copying again

### No sound in OBS

- Make sure you ran `pnpm run server` in a separate terminal
- Check that your OBS browser source URL is correct
- Try refreshing the browser source in OBS

### TTS not working

- Check that your `.env` file has the correct AWS keys
- Make sure you restarted the server after adding keys
- Check the server terminal for error messages

### Alerts showing twice

- Disable your StreamElements Cheer alert in the AlertBox settings
- MinaQueue replaces it, so you only need one!

---

## 📝 Quick Reference

| Resource | URL/Command |
|----------|-------------|
| Dashboard | `http://localhost:5173` |
| OBS Overlay | `http://localhost:5173/overlay` |
| Overlay Settings | `http://localhost:5173/overlay-settings` |
| Start Server | `pnpm run server` |
| Start App | `pnpm run dev` |

---

## 🐛 Known Bugs

| Bug | Workaround |
|-----|------------|
| Custom alert image (GIF) doesn't persist after restart | Re-upload the image in Overlay Settings after starting the app |

---

## 📋 Roadmap

### 🔐 Security & Authentication
- [ ] Twitch OAuth login
- [ ] User whitelist (admin controls who can access)
- [ ] Session management
- [ ] Role-based access (admin vs viewer)

### 🎨 UI & Personalization  
- [ ] Theme presets (dark, light, custom)
- [ ] Alert animation options
- [ ] Sound effect customization
- [ ] Mobile-responsive dashboard

### 🔧 Core Features
- [ ] Persistent alert image storage (fix known bug)
- [ ] Multiple queue support
- [ ] Alert history/logs
- [ ] Hotkey support for gate control
- [ ] Alert preview in settings

### ☁️ Deployment
- [ ] Railway/Render deployment testing
- [ ] Docker support
- [ ] One-click install script

### 🔌 Integrations
- [ ] Streamlabs support (re-add if needed)
- [ ] Direct Twitch EventSub integration
- [ ] Custom TTS voice uploads
- [ ] Discord webhook notifications

---

## 💜 Credits

Made by **BytesWan | Coder Minawan** 🩷🩷

---

## 🛠️ For Developers

<details>
<summary>Click to expand technical details</summary>

### Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS v4
- Zustand (state management)
- WebSocket server (ws)
- Amazon Polly (TTS)

### Project Structure

```text
src/
├── components/     # UI components
├── hooks/          # React hooks
├── services/       # API integrations
├── store/          # Zustand store
└── types/          # TypeScript types

server/
└── overlay-server.ts  # WebSocket + TTS proxy server
```

### Key Files

- `server/overlay-server.ts` - WebSocket bridge + Polly TTS proxy
- `src/components/OverlayMode.tsx` - OBS overlay logic
- `src/hooks/useOverlayWS.ts` - WebSocket client hook
- `src/store/useAppStore.ts` - Global state

### Environment Variables

```env
AWS_ACCESS_KEY_ID=     # AWS IAM user access key
AWS_SECRET_ACCESS_KEY= # AWS IAM user secret key
AWS_REGION=us-east-1   # AWS region for Polly
```

### Commands

```bash
pnpm install      # Install dependencies
pnpm run dev      # Start frontend dev server (port 5173)
pnpm run server   # Start WebSocket/TTS server (port 5175)
pnpm run build    # Build for production
```

### Deployment (Railway/Render)

> ⚠️ **Untested**

Can be deployed to Railway, Render, or any Node.js hosting:

1. Set environment variables in hosting dashboard
2. Build command: `pnpm install && pnpm run build`
3. Start command: `pnpm run start` (serves frontend + WebSocket server)

</details>
