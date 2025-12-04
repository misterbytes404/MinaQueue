# 🦴 MinaQueue - TTS Queue Manager

A cute, hellhound-themed TTS alert manager that lets you **pause and queue Cheer alerts** during important stream moments!

---

## ✨ What Does MinaQueue Do?

Ever get a loud TTS alert right in the middle of an emotional cutscene? MinaQueue fixes that!

- **🚪 Gate Control** - One click to pause all TTS alerts
- **📋 Queue System** - Alerts wait patiently until you're ready
- **🎤 Cloud TTS** - Same voice in your browser AND OBS (Brian from Amazon Polly!)
- **🎨 Customizable** - Change colors, fonts, and alert images
- **🦴 Bone-themed UI** - Because you're a hellhound!

---

## 🚀 Choose Your Setup

There are **two ways** to use MinaQueue:

| Option |  Difficulty |
|--------|------------|
| **☁️ Hosted Version** | ⭐ Easy |
| **💻 Local Setup** |  ⭐⭐⭐ Moderate |

---

## ☁️ Option A: Hosted Version
_See Dev Notes Section Below for Hosting Instructions_

If someone is hosting MinaQueue for you (like a friend or tech person), you just need:

1. **Dashboard URL** - Something like `https://minaqueue.yourname.app`
2. **Overlay URL** - Same URL but with `/overlay` at the end

**That's it!** No installation needed. Skip to [How to Use MinaQueue](#-how-to-use-minaqueue) to learn how to use it.

---

## 💻 Option B: Local Setup

### Requirements

- Windows 10/11
- [Node.js LTS](https://nodejs.org/) installed
- StreamElements account
- OBS Studio
- Amazon AWS account (for TTS - ~$1-3/month, first year mostly free)

### Step 1: Install Node.js & pnpm

Install [Node.js LTS](https://nodejs.org/), then open PowerShell:

```powershell
npm install -g pnpm
```

### Step 2: Clone the Repository

```powershell
cd C:\
git clone https://github.com/misterbytes404/MinaQueue.git
cd MinaQueue
pnpm install
```

Or download the ZIP from GitHub and extract to `C:\MinaQueue`.

### Step 3: Start MinaQueue

Open **two PowerShell windows**:

**Window 1 - Server:**
```powershell
cd C:\MinaQueue
pnpm run server
```

**Window 2 - App:**
```powershell
cd C:\MinaQueue
pnpm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔗 Connect to StreamElements

1. Go to [StreamElements Account Settings](https://streamelements.com/dashboard/account/channels)
2. Click **"Show secrets"**
3. Copy your **JWT Token**
4. Paste it in MinaQueue and click **Connect**

---

## 📺 OBS Overlay Setup

1. Add a **Browser** source in OBS
2. URL: `http://localhost:5173/overlay`
3. Size: **1920x1080**

**Note:** Disable your existing StreamElements Cheer/Bits alert to avoid duplicates.

---

## 🔊 Amazon Polly Setup (TTS)

### Cost

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

---

## 🎮 How to Use MinaQueue

### The Gate

The big button at the top controls whether alerts play:

| State | What Happens |
|-------|--------------|
| 🚪 **OPEN** | Alerts play immediately |
| 🔒 **CLOSED** | Alerts queue up and wait |

### The Queue

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

**Overlay Settings:** `http://localhost:5173/overlay-settings`
- Alert image, colors, font, duration

**Voice & Volume:** Dashboard footer
- TTS voice selection, volume slider (syncs to OBS)

---

## 🗣️ Available TTS Voices

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

## 🔧 Quick Reference

| What | URL/Command |
|------|-------------|
| Dashboard | `http://localhost:5173` |
| OBS Overlay | `http://localhost:5173/overlay` |
| Overlay Settings | `http://localhost:5173/overlay-settings` |
| Start Server | `pnpm run server` |
| Start App | `pnpm run dev` |

### 🔁 Starting MinaQueue Each Time

Every time you want to stream with MinaQueue:

1. Open PowerShell, run: `cd C:\MinaQueue` then `pnpm run server`
2. Open another PowerShell, run: `cd C:\MinaQueue` then `pnpm run dev`
3. Open `http://localhost:5173` in your browser
4. Connect to StreamElements (first time only, it remembers!)
5. Start streaming!

---

## 🐛 Known Bugs

| Bug | Workaround |
|-----|------------|
| Custom alert image (GIF) doesn't persist after restart | Re-upload the image in Overlay Settings after starting the app |

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

### Deployment to Railway/Render
#### Untested

Can be deployed to Railway, Render, or any Node.js hosting:

1. Set environment variables in hosting dashboard
2. Build command: `pnpm install && pnpm run build`
3. Start command: `pnpm run start` (serves frontend + WebSocket server)

</details>
