# Zeus Setup Guide with Google Service Account

## 1. Google Cloud Setup

### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Drive API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create Service Account:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Name: "Zeus Video Tool"
   - Click "Create and Continue"
   - Grant role: "Editor" or "Owner"
   - Click "Done"

5. Generate Key:
   - Click on the service account you created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - Download the key file

6. Setup File:
   - Rename downloaded file to `service-account-key.json`
   - Place it in the Zeus project root directory

### Share Google Drive Folder (Important!)

1. Create a folder in Google Drive for Zeus
2. Right-click the folder → "Share"
3. Add the service account email (found in service-account-key.json as "client_email")
4. Give it "Editor" permissions

## 2. TwelveLabs Setup

1. Sign up at [TwelveLabs.io](https://twelvelabs.io)
2. Get your API key from the dashboard
3. Add to `.env.local`

## 3. Configure Zeus

Update `.env.local`:
```env
# Optional: Specify a parent folder ID if you want campaigns in a specific folder
# Otherwise Zeus will create its own root folder
GOOGLE_DRIVE_FOLDER_ID=

# TwelveLabs API
TWELVE_LABS_API_KEY=your_twelve_labs_key_here
```

## 4. Run Zeus

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Troubleshooting

### "Service account key not found"
- Ensure `service-account-key.json` is in the project root
- Check the file name is exactly `service-account-key.json`

### "Permission denied" when creating folders
- Make sure you shared a Google Drive folder with the service account email
- The service account needs Editor permissions

### Videos not uploading
- Check FFmpeg is properly installed (comes with ffmpeg-static package)
- Ensure enough disk space for temporary video processing