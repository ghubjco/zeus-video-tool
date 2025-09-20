# Zeus OAuth Setup Guide

Since you can't generate a service account JSON key, we'll use OAuth2 authentication instead. Here's how to set it up:

## Step 1: Create OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (creative-automator)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback`
7. Save and copy the Client ID and Client Secret

## Step 2: Configure Zeus

Update your `.env.local` file:

```env
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_oauth_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# After first authentication, add the refresh token here
GOOGLE_REFRESH_TOKEN=

# TwelveLabs API
TWELVE_LABS_API_KEY=your_twelve_labs_api_key_here
```

## Step 3: First-Time Authentication

1. Start Zeus: `npm run dev`
2. Open http://localhost:3000
3. Click "Connect Google Drive"
4. Authorize the application
5. You'll see a page with your refresh token
6. Copy the refresh token
7. Add it to `.env.local` as `GOOGLE_REFRESH_TOKEN=your_token_here`
8. Restart the server

## Step 4: Using Zeus

After adding the refresh token, Zeus will automatically authenticate using it. You won't need to log in again unless the token expires.

## Troubleshooting

### "Error starting authentication"
- Check that your Client ID and Secret are correctly added to `.env.local`
- Ensure the redirect URI matches exactly: `http://localhost:3000/api/auth/callback`

### "Authentication expired"
- You'll need to re-authenticate by clicking "Connect Google Drive" again
- Update the refresh token in `.env.local` with the new one

### Videos not uploading
- Make sure you have enough Google Drive storage
- Check that the Google Drive API is enabled in your project

## For Your Service Account

Based on the info you provided:
- Service Account Email: `creative-automator@creative-automator.iam.gserviceaccount.com`
- Client ID: `110914372895116815624`

You'll need to create OAuth2 credentials (not service account credentials) to use this setup since you can't download the JSON key.