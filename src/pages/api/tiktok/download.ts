import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // For TikTok videos, we just return the URL
  // The actual download will be handled by yt-dlp in the video processor
  res.status(200).json({
    videoUrl: url,
    message: 'TikTok URL ready for processing'
  });
}