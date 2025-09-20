import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleDriveService } from '@/lib/googleDrive';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const driveService = new GoogleDriveService();
    const authUrl = await driveService.getAuthUrl();
    res.status(200).json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
}