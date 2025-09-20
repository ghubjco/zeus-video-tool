import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Try to use ffmpeg-static first, then fall back to system ffmpeg
if (ffmpegStatic) {
  console.log('Using ffmpeg-static from:', ffmpegStatic);
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.log('ffmpeg-static not available, checking for system ffmpeg...');
  try {
    const ffmpegPath = execSync('which ffmpeg').toString().trim();
    console.log('Found system ffmpeg at:', ffmpegPath);
    ffmpeg.setFfmpegPath(ffmpegPath);
  } catch (error) {
    console.error('WARNING: ffmpeg not found! Video processing will fail.');
    console.error('Please ensure ffmpeg is installed on the system.');
  }
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