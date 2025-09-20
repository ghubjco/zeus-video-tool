#!/bin/bash

# Railway Environment Variables Setup Script
echo "Setting up Railway environment variables..."

# Read values from .env.local
source .env.local

# Set each environment variable in Railway
railway variables set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
railway variables set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
railway variables set GOOGLE_REDIRECT_URI="$GOOGLE_REDIRECT_URI"
railway variables set GOOGLE_REFRESH_TOKEN="$GOOGLE_REFRESH_TOKEN"
railway variables set TWELVE_LABS_API_KEY="$TWELVE_LABS_API_KEY"
railway variables set NEXT_PUBLIC_BASE_URL="https://zeus-video-tool.up.railway.app"
railway variables set JWT_SECRET="$JWT_SECRET"

echo "Environment variables set successfully!"
echo ""
echo "Next steps:"
echo "1. Upload your service-account-key.json file content as GOOGLE_SERVICE_ACCOUNT_KEY variable in Railway dashboard"
echo "2. Run: railway up"
echo "3. Your app will be available at your Railway URL"