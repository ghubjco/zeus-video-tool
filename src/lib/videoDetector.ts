export enum VideoType {
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  RAW = 'raw',
}

export interface VideoInfo {
  type: VideoType;
  url: string;
  videoId?: string;
  embedUrl?: string;
}

export class VideoDetector {
  static detectVideoType(url: string): VideoInfo {
    const tiktokRegex = /(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
    const tiktokShortRegex = /vm\.tiktok\.com\/(\w+)/;

    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const youtubeShortRegex = /youtube\.com\/shorts\/([^&\n?#]+)/;

    if (tiktokRegex.test(url) || tiktokShortRegex.test(url)) {
      const match = url.match(tiktokRegex) || url.match(tiktokShortRegex);
      return {
        type: VideoType.TIKTOK,
        url,
        videoId: match?.[1],
      };
    }

    if (youtubeRegex.test(url) || youtubeShortRegex.test(url)) {
      const match = url.match(youtubeRegex) || url.match(youtubeShortRegex);
      const videoId = match?.[1];
      return {
        type: VideoType.YOUTUBE,
        url,
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      };
    }

    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const isVideoUrl = videoExtensions.some(ext => url.toLowerCase().includes(ext));

    if (isVideoUrl || url.startsWith('http') || url.startsWith('https')) {
      return {
        type: VideoType.RAW,
        url,
      };
    }

    return {
      type: VideoType.RAW,
      url,
    };
  }

  static async getTikTokVideoUrl(url: string): Promise<string> {
    try {
      const response = await fetch('/api/tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      return data.videoUrl;
    } catch (error) {
      console.error('Error fetching TikTok video:', error);
      throw error;
    }
  }

  static getYouTubeVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
}