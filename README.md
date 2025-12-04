# 🦴 MinaQueue - TTS Queue Manager

A cute, hellhound-themed TTS alert manager that lets you **pause and queue Cheer alerts** during important stream moments!

---

## ✨ What Does MinaQueue Do?

Ever get a loud TTS alert right in the middle of an emotional cutscene? MinaQueue fixes that!

- **🚪 Gate Control** - One click to pause all TTS alerts
- **📋 Queue System** - Alerts wait patiently until you're ready
- **🎤 Cloud TTS** - Same voice in your browser AND OBS (powered by Amazon Polly)
- **🎨 Customizable** - Change colors, fonts, and alert images
- **🦴 Bone-themed UI** - Because you're a hellhound!

---

## 🚀 Getting Started

### What You'll Need

1. **StreamElements account** (for receiving alerts)
2. **OBS Studio** (for streaming)
3. **Amazon AWS account** (for TTS voices - has a generous free tier!)

---

## 📋 Setup Guide

### Step 1: Start MinaQueue

You'll need to run two things in separate terminal/command windows:

**Window 1 - The Server (handles TTS):**

```powershell
pnpm run server
```

**Window 2 - The Dashboard:**

```powershell
pnpm run dev
```

Then open your browser to: **http://localhost:5173**

---

### Step 2: Connect to StreamElements

1. Go to [StreamElements Account Settings](https://streamelements.com/dashboard/account/channels)
2. Scroll down and click **"Show secrets"**
3. Copy your **JWT Token** (it's a long string of random letters and numbers)
4. In MinaQueue, paste the token and click **Connect**
5. You should see a green "Connected" status!

---

### Step 3: Set Up the OBS Overlay

This is the alert that appears on your stream.

1. In **OBS**, click the **+** button under Sources
2. Select **Browser**
3. Name it "MinaQueue Alerts" and click OK
4. Set the URL to: `http://localhost:5173/overlay`
5. Set **Width: 1920** and **Height: 1080**
6. Click OK

**Important:** Disable your existing StreamElements Cheer/Bits alert so you don't get double alerts!

---

### Step 4: Set Up Amazon Polly (TTS Voices)

This gives you high-quality TTS that sounds the same everywhere.

#### How Much Does It Cost?

| Usage | Monthly Cost |
|-------|--------------|
| Light (500 alerts) | ~$0.30 |
| Medium (2,000 alerts) | ~$1.20 |
| Heavy (5,000 alerts) | ~$3.00 |

**First 12 months:** You get 5 million characters FREE! That's roughly 25,000+ alerts.

#### Setup Steps

1. **Create an AWS Account**
   - Go to [aws.amazon.com](https://aws.amazon.com/)
   - Click "Create an AWS Account"
   - You'll need a credit card, but you won't be charged for the free tier

2. **Create a User for MinaQueue**
   - Go to [IAM Users](https://console.aws.amazon.com/iam/home#/users)
   - Click **Create user**
   - Name: `minaqueue` (or anything you like)
   - Click **Next**
   - Choose **Attach policies directly**
   - Search for `AmazonPollyReadOnlyAccess` and check the box ☑️
   - Click **Next** → **Create user**

3. **Get Your Access Keys**
   - Click on the user you just created
   - Click the **Security credentials** tab
   - Scroll down to "Access keys" and click **Create access key**
   - Choose **Application running outside AWS**
   - Click **Next** → **Create access key**
   - **IMPORTANT:** Save both the Access Key ID and Secret Access Key somewhere safe!

4. **Add Keys to MinaQueue**
   
   Find the `.env` file in your MinaQueue folder and edit it:

   ```env
   AWS_ACCESS_KEY_ID=paste_your_access_key_here
   AWS_SECRET_ACCESS_KEY=paste_your_secret_key_here
   AWS_REGION=us-east-1
   ```

5. **Restart the server** (close the terminal running `pnpm run server` and run it again)

---

## 🎮 How to Use MinaQueue

### The Gate

| Button | What It Does |
|--------|--------------|
| 🚪 **OPEN** | Alerts play immediately |
| 🔒 **CLOSED** | Alerts queue up and wait |

**Pro tip:** Close the gate during cutscenes, boss fights, or emotional moments!

### The Queue

When the gate is closed, alerts stack up in your queue. You can:

- **▶️ Play** - Play one alert immediately
- **❌ Bury** - Delete an alert you don't want
- **Clear Played** - Remove alerts that already played

### Settings

Click the ⚙️ gear icon to:

- Change the TTS voice
- Adjust volume
- Set minimum bits (ignore small cheers)
- Customize alert appearance
- Add test messages

---

## 🎨 Customizing Your Alerts

Go to **http://localhost:5173/overlay-settings** to customize:

- **Alert Image** - Upload your own image!
- **Colors** - Background, border, text colors
- **Font** - Change the font family and size
- **Duration** - How long alerts stay on screen

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
| Dashboard | http://localhost:5173 |
| OBS Overlay | http://localhost:5173/overlay |
| Overlay Settings | http://localhost:5173/overlay-settings |
| Start Server | `pnpm run server` |
| Start Dashboard | `pnpm run dev` |

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

### Commands

```bash
pnpm install      # Install dependencies
pnpm run dev      # Start frontend dev server
pnpm run server   # Start WebSocket/TTS server
pnpm run build    # Build for production
```

</details>