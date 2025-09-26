import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Try to use ffmpeg-static first, then fall back to system ffmpeg
let ffmpegPath: string | null = null;

if (ffmpegStatic) {
  console.log('Using ffmpeg-static from:', ffmpegStatic);
  ffmpegPath = ffmpegStatic;
} else {
  console.log('ffmpeg-static not available, checking for system ffmpeg...');
}

// Check multiple possible ffmpeg locations
const possibleFfmpegPaths = [
  '/usr/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/app/vendor/ffmpeg/ffmpeg',
  '/opt/ffmpeg/ffmpeg'
];

if (!ffmpegPath) {
  for (const path of possibleFfmpegPaths) {
    try {
      if (fs.existsSync(path)) {
        console.log('Found ffmpeg at:', path);
        ffmpegPath = path;
        break;
      }
    } catch (error) {
      // Continue checking other paths
    }
  }
}

// Try 'which' command as last resort
if (!ffmpegPath) {
  try {
    const whichPath = execSync('which ffmpeg').toString().trim();
    if (whichPath) {
      console.log('Found system ffmpeg via which at:', whichPath);
      ffmpegPath = whichPath;
    }
  } catch (error) {
    console.error('ffmpeg not found via which command');
  }
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log('ffmpeg configured successfully at:', ffmpegPath);
} else {
  console.error('CRITICAL: ffmpeg not found! Video processing will fail.');
  console.error('Checked paths:', possibleFfmpegPaths);
  console.error('Please ensure ffmpeg is installed on the system.');
}

export interface TrimOptions {
  startTime: number;
  endTime: number;
  inputPath: string;
  outputPath: string;
}

export class VideoTrimmer {
  static async trimVideo(options: TrimOptions): Promise<string> {
    const { startTime, endTime, inputPath, outputPath } = options;
    const duration = endTime - startTime;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('end', () => {
          console.log('Video trimming completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Error trimming video:', err);
          reject(err);
        })
        .run();
    });
  }

  static async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  static async generateThumbnail(videoPath: string, outputPath: string, timestamp: number = 1): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x240'
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  static async downloadVideo(url: string, outputPath: string): Promise<string> {
    const axios = require('axios');
    const writer = fs.createWriteStream(outputPath);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(outputPath));
      writer.on('error', reject);
    });
  }
}