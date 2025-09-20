import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const TOKENS_PATH = path.join(process.cwd(), 'tokens.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if we have refresh token in env or tokens file
  const hasRefreshToken = !!process.env.GOOGLE_REFRESH_TOKEN;
  const hasTokenFile = fs.existsSync(TOKENS_PATH);

  const authenticated = hasRefreshToken || hasTokenFile;
  res.status(200).json({ authenticated });
}