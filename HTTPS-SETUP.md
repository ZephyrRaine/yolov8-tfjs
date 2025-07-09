# HTTPS Setup for Camera Access

## Why HTTPS is needed

`getUserMedia()` requires a secure context (HTTPS) to work, except on localhost. When accessing the app from your phone on the same WiFi network, you need HTTPS.

## Step 1: Generate SSL Certificates

You need to generate self-signed SSL certificates for local development.

### Prerequisites

Make sure you have OpenSSL installed:

- **Windows**: Download from [OpenSSL for Windows](https://slproweb.com/products/Win32OpenSSL.html) or use Git Bash
- **macOS**: Already installed or use `brew install openssl`
- **Linux**: Usually pre-installed or use `sudo apt-get install openssl`

### Generate the certificates

Run these commands in your project root directory:

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365
```

When prompted, you can press Enter for all fields or fill them out:

- Country Name: `US`
- State: `Your State`
- City: `Your City`
- Organization: `Your Organization`
- Organizational Unit: `IT Department`
- Common Name: `localhost` (important!)
- Email: `your@email.com`

### Copy certificates to server directory

```bash
# Copy certificates to server folder
cp cert.pem server/
cp key.pem server/
```

### Final file structure

After generating certificates, you should have:

```
yolov8-tfjs/
├── cert.pem          # SSL certificate (root)
├── key.pem           # Private key (root)
├── server/
│   ├── cert.pem      # SSL certificate (server copy)
│   ├── key.pem       # Private key (server copy)
│   └── index.js
└── ... other files
```

## Step 2: What was set up

1. **Self-signed SSL certificates** (`cert.pem` and `key.pem`)
2. **Vite HTTPS dev server** on port 3000 with hot reloading
3. **Express HTTPS API server** on port 5000
4. **Vite proxy configuration** - `/api` requests are forwarded to port 5000

## Step 3: How to start

### Option 1: Use the batch file (Windows)

```bash
./start-https.bat
```

### Option 2: Start manually

```bash
# Terminal 1: Start backend HTTPS server
cd server
npm start

# Terminal 2: Start Vite dev server with HTTPS
npm run start:https
```

## Step 4: How it works

- **Vite dev server** runs on port 3000 with HTTPS and hot reloading
- **API server** runs on port 5000 with HTTPS
- **Vite proxy** forwards `/api/*` requests from port 3000 to port 5000
- **From your phone**: All requests go to `https://[YOUR-IP]:3000`
- **API calls**: Automatically proxied to the backend server

## Step 5: Accessing from your phone

1. **Find your computer's IP address**:

   ```bash
   ipconfig
   ```

   Look for your WiFi adapter's IPv4 address (e.g., `192.168.1.100`)

2. **Access the app**:

   - Open your phone's browser
   - Go to `https://[YOUR-IP]:3000` (e.g., `https://192.168.1.100:3000`)

3. **Accept the security warning**:
   - Your browser will show a security warning because it's a self-signed certificate
   - Click "Advanced" → "Proceed to [IP] (unsafe)" or similar
   - This is safe for local development

## Development features

- ✅ **Hot reloading** - Changes to React code update instantly
- ✅ **HTTPS** - Camera access works on mobile
- ✅ **Single port** - Everything accessible from port 3000
- ✅ **API proxy** - No CORS issues
- ✅ **Network access** - Works from phone on same WiFi

## Servers running

- **Frontend (Vite)**: `https://localhost:3000` (with hot reloading)
- **Backend API**: `https://localhost:5000` (proxied through Vite)
- **Fallback HTTP Backend**: `http://localhost:5001` (for local development)

## Troubleshooting

- **Certificate errors**: Normal for self-signed certificates, just accept the warning
- **Network access**: Make sure your phone and computer are on the same WiFi network
- **Firewall**: Windows Firewall might block the connection, allow Node.js if prompted
- **Port conflicts**: If port 3000 or 5000 are in use, change them in the config files
- **API not working**: Check that both servers are running and the proxy is configured

## Camera permissions

Once you access the HTTPS site from your phone:

1. Click "Open Webcam"
2. iOS Safari will show a camera permission dialog
3. Allow camera access
4. The camera should now work properly!

## API calls

All API calls are made to `/api/analyse-clothing` and automatically proxied to the backend server. No need to specify ports or hostnames!
