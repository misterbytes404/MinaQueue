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

| Option | Best For | Difficulty |
|--------|----------|------------|
| **☁️ Hosted Version** | Just want it to work! | ⭐ Easy |
| **💻 Local Setup** | Want to run it yourself | ⭐⭐⭐ Moderate |

---

## ☁️ Option A: Hosted Version (Easiest!)

If someone is hosting MinaQueue for you (like a friend or tech person), you just need:

1. **Dashboard URL** - Something like `https://minaqueue.yourname.app`
2. **Overlay URL** - Same URL but with `/overlay` at the end

**That's it!** No installation needed. Skip to [How to Use MinaQueue](#-how-to-use-minaqueue) to learn how to use it.

---

## 💻 Option B: Run It Yourself (Local Setup)

Want to run MinaQueue on your own computer? Follow this guide!

### What You'll Need

- **Windows 10/11** computer
- **StreamElements account** (for receiving alerts)
- **OBS Studio** (for streaming)
- **Amazon AWS account** (for TTS voices - costs ~$1-3/month, first year mostly free!)

### Step 1: Install Node.js

Node.js is what makes MinaQueue run. You only need to do this once!

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS** version (the big green button on the left)
3. Run the installer, click Next through everything
4. **Restart your computer**

### Step 2: Install pnpm

pnpm helps manage the app. Open **PowerShell** (search for it in Start menu) and run:

```powershell
npm install -g pnpm
```

### Step 3: Download MinaQueue

1. Download the MinaQueue files (ZIP file or from GitHub)
2. Extract/unzip to a folder you'll remember (like `C:\MinaQueue`)

### Step 4: Install Dependencies

Open **PowerShell**, navigate to your MinaQueue folder, and run:

```powershell
cd C:\MinaQueue
pnpm install
```

This downloads everything MinaQueue needs. Takes a minute or two.

### Step 5: Start MinaQueue!

You need to run **two commands** in **two separate PowerShell windows**:

**Window 1 - The Server:**
```powershell
cd C:\MinaQueue
pnpm run server
```
Keep this window open! You should see "HTTP server running on http://localhost:5175"

**Window 2 - The App:**
```powershell
cd C:\MinaQueue
pnpm run dev
```
Keep this window open too! It will show a URL.

**Now open your browser to:** `http://localhost:5173`

🎉 **MinaQueue is running!**

---

## 🔗 Connect to StreamElements

1. Go to [StreamElements Account Settings](https://streamelements.com/dashboard/account/channels)
2. Scroll down and click **"Show secrets"**
3. Copy your **JWT Token** (it's a long string of random letters and numbers)
4. In MinaQueue, paste the token and click **Connect**
5. You should see a green "Connected" status!

---

## 📺 Set Up the OBS Overlay

This is the alert that appears on your stream.

1. In **OBS**, click the **+** button under Sources
2. Select **Browser**
3. Name it "MinaQueue Alerts" and click OK
4. Set these settings:
   - **URL:** `http://localhost:5173/overlay`
   - **Width:** `1920`
   - **Height:** `1080`
5. Click **OK**

**⚠️ Important:** Disable your existing StreamElements Cheer/Bits alert so you don't get double alerts!

---

## 🔊 Set Up Amazon Polly (TTS Voices)

This gives you high-quality TTS that sounds the same in your browser AND OBS!

### How Much Does It Cost?

| Usage | Monthly Cost |
|-------|--------------|
| Light (500 alerts) | ~$0.30 |
| Medium (2,000 alerts) | ~$1.20 |
| Heavy (5,000 alerts) | ~$3.00 |

**First 12 months:** 5 million characters FREE! That's roughly 25,000+ alerts.

### Create an AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com/)
2. Click **"Create an AWS Account"**
3. Follow the steps (you'll need an email and credit card)
4. Don't worry - you won't be charged much with normal use!

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

1. In your MinaQueue folder, find the file called `.env.example`
2. Make a copy and rename it to `.env`
3. Open `.env` in Notepad and fill in your keys:

```env
AWS_ACCESS_KEY_ID=paste_your_access_key_here
AWS_SECRET_ACCESS_KEY=paste_your_secret_key_here
AWS_REGION=us-east-1
```

4. Save the file
5. **Restart the server** (close the PowerShell window running `pnpm run server` and start it again)

---

## 🎮 How to Use MinaQueue

### The Gate

The big button at the top controls whether alerts play:

| State | What Happens |
|-------|--------------|
| 🚪 **OPEN** (Green) | Alerts play immediately |
| 🔒 **CLOSED** (Red) | Alerts queue up and wait |

**Pro tip:** Close the gate during cutscenes, boss fights, or emotional moments!

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

## 🎨 Customizing Your Alerts

### Overlay Settings Page

Go to `http://localhost:5173/overlay-settings` to customize:

- **Alert Image** - Upload your own GIF or image!
- **Colors** - Background, border, text colors
- **Font** - Change the font family and size
- **Duration** - How long alerts stay on screen

### Voice & Volume

In the dashboard footer:

- **TTS Voice** - Pick from Brian, Amy, Joanna, and more!
- **Volume Slider** - Adjust how loud alerts are (syncs to OBS overlay too!)

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

## 💜 Credits

Made with love by **BytesWan | Coder Minawan** for **CerberVT**

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

Can be deployed to Railway, Render, or any Node.js hosting:

1. Set environment variables in hosting dashboard
2. Build command: `pnpm install && pnpm run build`
3. Start command: `pnpm run start` (serves frontend + WebSocket server)

</details>
