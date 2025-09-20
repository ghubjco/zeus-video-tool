# Zeus Video Tool

A Next.js application for downloading, trimming, and organizing video content from TikTok, YouTube, and direct URLs. Videos are automatically saved to Google Drive and uploaded to TwelveLabs.io for AI-powered analysis.

## Features

- **Campaign Management**: Organize videos by campaign in Google Drive folders
- **Multi-Platform Support**: Auto-detect and process TikTok, YouTube, and raw video URLs
- **Video Trimming**: Trim videos to specific start/end times
- **Automatic Naming**: Files saved with convention: `CampaignName_UploadDate_UploadType`
- **Dual Upload**: Simultaneous upload to Google Drive and TwelveLabs.io
- **Persistent Campaign Selection**: Stays on same campaign until manually changed

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
TWELVE_LABS_API_KEY=your_twelve_labs_api_key
```

3. Set up Google Cloud Console:
   - Create a new project
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Add `http://localhost:3000/api/auth/callback` to authorized redirect URIs

4. Get TwelveLabs API key from https://twelvelabs.io

5. Run the development server:
```bash
npm run dev
```

## Usage

1. **Authenticate**: Connect your Google Drive account
2. **Select Campaign**: Choose or create a campaign folder
3. **Add Video URL**: Paste TikTok, YouTube, or direct video URL
4. **Find Video**: Click to load and preview the video
5. **Trim**: Set start and end times (in seconds)
6. **Save Trim**: Process and upload to both Google Drive and TwelveLabs
7. **Continue**: Tool resets for next video in same campaign
8. **Change Campaign**: Use button to switch to different campaign

## Tech Stack

- Next.js with TypeScript
- Tailwind CSS for styling
- Google Drive API for storage
- TwelveLabs.io for video AI analysis
- FFmpeg for video processing
- OAuth 2.0 for authentication