# ⚠️ IMPORTANT: Fix Verification Email Link

The verification email contains a link like:
  http://localhost:3000/verify-email?token=...

This works ONLY if you open the email on the SAME machine running the app.

If you open the email on a PHONE or DIFFERENT COMPUTER, change CLIENT_URL in server/.env:

## Option 1: Same WiFi Network
Find your computer's local IP:
- Windows: run `ipconfig` → look for IPv4 Address (e.g. 192.168.1.105)
- Mac/Linux: run `ifconfig` → look for inet (e.g. 192.168.1.105)

Then set:
  CLIENT_URL=http://192.168.1.105:3000

Also update client/.env.local:
  NEXT_PUBLIC_API_URL=http://192.168.1.105:5000
  NEXT_PUBLIC_SOCKET_URL=http://192.168.1.105:5000

## Option 2: Public Internet (deploy)
  CLIENT_URL=https://yourdomain.com

## Option 3: Use ngrok (easiest for testing)
  npm install -g ngrok
  ngrok http 3000
  → Copy the https URL (e.g. https://abc123.ngrok.io)
  CLIENT_URL=https://abc123.ngrok.io
