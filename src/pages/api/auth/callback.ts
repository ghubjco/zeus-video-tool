import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleDriveService } from '@/lib/googleDrive';
import fs from 'fs';
import path from 'path';

const TOKENS_PATH = path.join(process.cwd(), 'tokens.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    const driveService = new GoogleDriveService();
    const tokens = await driveService.setCredentials(code);

    // Save tokens
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens));

    // Show the refresh token to the user
    res.send(`
      <html>
        <head>
          <title>Zeus - Authentication Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: #111;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              background: #1a1a1a;
              padding: 2rem;
              border-radius: 8px;
              max-width: 600px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            }
            h1 { color: #4ade80; margin-bottom: 1rem; }
            .token-box {
              background: #262626;
              padding: 1rem;
              border-radius: 4px;
              word-break: break-all;
              font-family: monospace;
              margin: 1rem 0;
            }
            .instructions {
              background: #1e3a8a;
              padding: 1rem;
              border-radius: 4px;
              margin-top: 1rem;
            }
            a {
              color: #60a5fa;
              text-decoration: none;
            }
            button {
              background: #4ade80;
              color: black;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Authentication Successful!</h1>

            <p><strong>Your refresh token (save this!):</strong></p>
            <div class="token-box">${tokens.refresh_token || 'No refresh token received'}</div>

            <div class="instructions">
              <p><strong>Next steps:</strong></p>
              <ol>
                <li>Copy the refresh token above</li>
                <li>Add it to your <code>.env.local</code> file as <code>GOOGLE_REFRESH_TOKEN=...</code></li>
                <li>Restart the server</li>
              </ol>
            </div>

            <button onclick="window.location.href='/'">Go to Zeus</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error handling callback:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
}