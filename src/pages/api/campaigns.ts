import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleDriveService } from '@/lib/googleDrive';
import fs from 'fs';
import path from 'path';

const TOKENS_PATH = path.join(process.cwd(), 'tokens.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const driveService = new GoogleDriveService();

  try {
    // Initialize with refresh token from env or file
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      await driveService.initialize();
      await driveService.setRefreshToken(process.env.GOOGLE_REFRESH_TOKEN);
    } else if (fs.existsSync(TOKENS_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
      await driveService.initialize();
      await driveService.setRefreshToken(tokens.refresh_token);
    } else {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
    }

    if (req.method === 'GET') {
      // Ensure root folder exists first
      const rootFolderId = await driveService.ensureRootFolder();
      process.env.GOOGLE_DRIVE_FOLDER_ID = rootFolderId;

      const campaigns = await driveService.listCampaigns();
      res.status(200).json(campaigns);
    } else if (req.method === 'POST') {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Campaign name is required' });
      }

      // Ensure root folder exists first
      const rootFolderId = await driveService.ensureRootFolder();
      process.env.GOOGLE_DRIVE_FOLDER_ID = rootFolderId;

      const folder = await driveService.createCampaignFolder(name);
      res.status(201).json(folder);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Campaigns API error:', error);

    if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired')) {
      return res.status(401).json({
        error: 'Authentication expired. Please re-authenticate.'
      });
    }

    res.status(500).json({
      error: 'Failed to process campaigns request',
      details: error.message
    });
  }
}