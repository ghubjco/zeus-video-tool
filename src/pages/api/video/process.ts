import type { NextApiRequest, NextApiResponse } from 'next';
import { VideoProcessor } from '@/lib/videoProcessor';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoUrl, campaignName, campaignFolderId, startTime, endTime, uploadType } = req.body;

  if (!videoUrl || !campaignName || !campaignFolderId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const processor = new VideoProcessor();
    const result = await processor.processAndSaveVideo({
      videoUrl,
      campaignName,
      campaignFolderId,
      startTime,
      endTime,
      uploadType
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error processing video:', error);

    if (error.message?.includes('service-account-key.json')) {
      return res.status(500).json({
        error: 'Service account key not found. Please add service-account-key.json to the project root.'
      });
    }

    res.status(500).json({
      error: 'Failed to process video',
      details: error.message
    });
  }
}