# 🦴 Minaqueue - TTS Queue Manager for Streamers

A custom TTS (Text-to-Speech) queue management dashboard designed for VTubers and streamers. Minaqueue lets you **pause incoming TTS alerts** during cutscenes or important moments, then **resume them later** - no more interruptions during dramatic moments!

![Theme: Cute Underworld / Hellhound]

---

## ✨ Features

- **🚪 Gate Control** - Pause/unpause your alert queue with one click
- **📋 Visual Queue** - See all pending TTS messages in a beautiful bone-themed UI
- **🔗 Multi-Provider Support** - Works with StreamLabs OR StreamElements
- **🎬 OBS Browser Source** - Custom alert overlay replaces native alerts for full control
- **🎤 TTS Playback** - Browser speech synthesis with customizable voices
- **🔊 Volume Control** - Adjust TTS volume on the fly
- **🗣️ Voice Selection** - Choose from your system's available voices
- **🧪 Test Mode** - Add test messages to try out the queue
- **💾 Persistent Settings** - Your preferences are saved automatically

---

## 🎮 How It Works

Minaqueue acts as an **intermediary** between your alert provider (StreamElements/StreamLabs) and OBS:

1. **Connect Minaqueue** to your alert provider
2. **Add Minaqueue's Overlay** as an OBS Browser Source
3. **Disable** your native StreamElements/StreamLabs alert box
4. When the **Gate is CLOSED**, alerts queue up silently
5. When the **Gate is OPEN**, alerts display through the Minaqueue overlay

This gives you **full control** over when alerts appear AND play TTS!

---

## 🚀 Quick Start (For Streamers)

### Step 1: Deploy Minaqueue

Choose one of the [Deployment Options](#-deployment-options) below to get your own Minaqueue instance.

### Step 2: Connect to StreamElements (Recommended - Easiest!)

1. Go to your [StreamElements Dashboard](https://streamelements.com/dashboard/account/channels)
2. Click **"Show secrets"** under Account Settings
3. Copy your **JWT Token**
4. Open Minaqueue and select "StreamElements"
5. Paste your JWT Token and click **Connect**
6. Done! Your alerts will now appear in Minaqueue

### Step 3: Set Up OBS Browser Source

**⚠️ IMPORTANT: This step is required for the Gate feature to work properly!**

Minaqueue includes a special **overlay mode** that acts as your alert display in OBS.

1. **In OBS**, add a new **Browser Source**
2. Set the URL to one of:
   - **Simple (uses saved credentials):**
     ```
     https://your-minaqueue-site.netlify.app/overlay
     ```
   - **With StreamElements token in URL:**
     ```
     https://your-minaqueue-site.netlify.app/overlay?provider=streamelements&token=YOUR_JWT_TOKEN
     ```
3. Set **Width: 1920** and **Height: 1080** (or your stream resolution)
4. ✅ Check **"Shutdown source when not visible"** (optional)

5. **DISABLE or REMOVE** your existing StreamElements/StreamLabs alertbox browser source!
   - This is crucial - if you keep the native alertbox, alerts will show twice

### Step 4: Test It!

1. Open Minaqueue dashboard in a browser tab
2. Click **⚙️ Settings** → **Add Test Message**
3. With the **Gate OPEN**, you should see the alert in OBS
4. **Close the Gate** and add another test - it should queue up
5. **Open the Gate** - the queued alert should now display!

---

## 🖥️ Deployment Options

### Option A: Deploy to Netlify (Recommended for Beginners)

**One-Click Deploy:**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

**Manual Netlify Deploy:**

1. **Fork or download this repository**

2. **Go to [Netlify](https://app.netlify.com/)**
   - Sign up/login with GitHub

3. **Create a new site:**
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub and select this repository

4. **Configure build settings:**
   ```
   Build command: pnpm build
   Publish directory: dist
   ```

5. **Add environment variables (if using StreamLabs):**
   - Go to Site Settings → Environment Variables
   - Add:
     ```
     VITE_STREAMLABS_CLIENT_ID=your_client_id
     VITE_STREAMLABS_CLIENT_SECRET=your_client_secret
     VITE_STREAMLABS_REDIRECT_URI=https://your-site.netlify.app/auth/streamlabs
     ```

6. **Deploy!** Your site will be live at `https://your-site-name.netlify.app`

---

### Option B: Deploy to Vercel

1. Go to [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Framework Preset: **Vite**
4. Build Command: `pnpm build`
5. Output Directory: `dist`
6. Add environment variables if needed
7. Deploy!

---

### Option C: Self-Host on Your Own Server

#### Prerequisites
- Node.js 18+ installed
- pnpm (recommended) or npm

#### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/minaqueue.git
   cd minaqueue
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Create environment file (optional, for StreamLabs):**
   ```bash
   cp .env.example .env
   # Edit .env with your StreamLabs credentials
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

5. **Serve the `dist` folder** using any static file server:

   **Using Node.js (serve):**
   ```bash
   npx serve dist -p 3000
   ```

   **Using Python:**
   ```bash
   cd dist && python -m http.server 3000
   ```

   **Using Nginx:**
   ```nginx
   server {
       listen 80;
       server_name minaqueue.yourdomain.com;
       root /path/to/minaqueue/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

6. **Access at** `http://localhost:3000` or your domain

---

### Option D: Run in Development Mode

For testing or development:

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Open http://localhost:5173
```

---

## ⚙️ Configuration

### StreamElements Setup

StreamElements is the easiest option - no app registration required!

1. Go to [StreamElements Dashboard](https://streamelements.com/dashboard/account/channels)
2. Scroll down to **"Show secrets"**
3. Copy the **JWT Token** (long string of characters)
4. In Minaqueue, select StreamElements and paste the token
5. Click Connect

**Security Note:** Your JWT token is stored locally in your browser and never sent to any server except StreamElements.

---

### StreamLabs Setup

StreamLabs requires creating an application for OAuth:

1. **Register your app:**
   - Go to [StreamLabs Developer Portal](https://dev.streamlabs.com/)
   - Create a new application
   - Set the redirect URI to: `https://your-domain.com/auth/streamlabs`
     - For local development: `http://localhost:5173/auth/streamlabs`

2. **Get your credentials:**
   - Copy your **Client ID**
   - Copy your **Client Secret**

3. **Configure Minaqueue:**
   
   Create a `.env` file in the project root:
   ```env
   VITE_STREAMLABS_CLIENT_ID=your_client_id_here
   VITE_STREAMLABS_CLIENT_SECRET=your_client_secret_here
   VITE_STREAMLABS_REDIRECT_URI=http://localhost:5173/auth/streamlabs
   ```

   For production (Netlify/Vercel), add these as environment variables in your hosting dashboard.

4. **Rebuild and deploy** if you made changes

---

## 🎮 How to Use

### Architecture Overview

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│ StreamElements │──▶│   Minaqueue   │──▶│ OBS Browser  │
│  / StreamLabs  │   │   Dashboard   │   │    Source    │
└─────────────┘     └───────────────┘     └──────────────┘
       │                    │                    │
   Sends events       Queues & controls      Displays alerts
                         playback           + plays TTS
```

### Basic Workflow

1. **Connect your provider** (StreamElements or StreamLabs) in the dashboard
2. **Add the overlay** as an OBS Browser Source (see [Quick Start](#-quick-start-for-streamers))
3. **Keep Minaqueue open** in a browser tab during your stream
4. **Close the Gate** when you need silence (cutscenes, important moments)
5. **Open the Gate** when ready to play queued alerts
6. Alerts display in OBS and TTS plays automatically

### Gate Control

| State | What Happens |
|-------|--------------|
| 🚪 **OPEN** | Alerts display immediately with TTS |
| 🔒 **CLOSED** | Alerts queue up silently, waiting to be played |

### Queue Management

- **Play Now** (▶️) - Force play a specific message immediately
- **Bury** (❌) - Delete a message from the queue
- **Clear Played** - Remove all already-played messages

### Settings

- **Minimum Bits/Amount** - Only queue alerts above this threshold
- **Volume** - Control TTS volume
- **Voice** - Select a different TTS voice
- **Add Test Message** - Test the queue without real alerts

---

## 🧪 Testing Without Going Live

You can test Minaqueue without connecting to any service:

1. Open Minaqueue
2. Click the **⚙️ Settings** button
3. Click **"Add Test Message"**
4. Test messages will appear in your queue
5. Use the Gate to practice pausing/resuming
6. Click ▶️ to play individual messages with browser TTS

This is great for:
- Learning how the interface works
- Testing before going live
- Demonstrating to others

---

## 🔧 Troubleshooting

### Browser Compatibility

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Overlay Settings | ✅ | ⚠️ Limited | ✅ | ⚠️ Limited |
| OBS Browser Source | ✅ | N/A | N/A | N/A |
| TTS Voices | ✅ Best | ✅ Good | ✅ Good | ⚠️ Limited |

**⚠️ Recommended: Use Google Chrome** for the best experience, especially for:
- Overlay Settings page (color pickers, file uploads)
- TTS voice variety
- OBS uses Chromium internally, so Chrome matches OBS behavior

**Firefox Known Issues:**
- Overlay Settings page may not render correctly
- Some CSS features (color-mix, certain animations) have limited support
- Workaround: Use Chrome or Edge for the Overlay Settings page

### "Connection Failed" with StreamElements
- Make sure you copied the **entire** JWT token
- Check that you're copying from the correct account
- Try refreshing the StreamElements dashboard and copying again

### "Voices not loading"
- Some browsers take a moment to load voices
- Try refreshing the page
- Chrome works best for voice variety

### "Gate not pausing alerts"
- Make sure you're connected (green status indicator)
- StreamElements uses overlay control - ensure your overlay is configured
- StreamLabs requires proper OAuth scopes

### Alerts not appearing in queue
- Check your minimum bits/amount setting
- Ensure your provider connection shows "Connected"
- Try sending a test alert from your StreamLabs/StreamElements dashboard

---

## 🏗️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.io** - Real-time events
- **Web Speech API** - Browser TTS

---

## 📁 Project Structure

```
src/
├── components/        # UI components
│   ├── Header.tsx
│   ├── GateControl.tsx
│   ├── QueueList.tsx
│   ├── BoneCard.tsx
│   ├── Footer.tsx
│   ├── SettingsModal.tsx
│   ├── ProviderSetup.tsx
│   ├── AuthCallback.tsx
│   ├── AlertDisplay.tsx    # OBS alert visual component
│   └── OverlayMode.tsx     # OBS Browser Source page
├── hooks/            # React hooks
│   ├── useTTSQueue.ts
│   ├── useTwitchListener.ts
│   └── useVoices.ts
├── services/         # API services
│   ├── streamlabs.ts
│   └── streamelements.ts
├── store/            # State management
│   └── useAppStore.ts
├── types/            # TypeScript types
│   └── index.ts
└── App.tsx           # Main app component
```

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

## 📜 License

MIT License - feel free to use this for your own streams!

---

## 💜 Credits
