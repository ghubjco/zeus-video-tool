import { GoogleDriveService } from './googleDrive';
import { VideoTrimmer } from './videoTrimmer';
import { TwelveLabsService } from './twelveLabs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
const youtubedl = require('youtube-dl-exec');

export interface ProcessVideoOptions {
  videoUrl: string;
  campaignName: string;
  campaignFolderId: string;
  startTime: number;
  endTime: number;
  uploadType?: string;
}

export class VideoProcessor {
  private googleDrive: GoogleDriveService;
  private twelveLabs: TwelveLabsService;

  constructor() {
    this.googleDrive = new GoogleDriveService();
    this.twelveLabs = new TwelveLabsService();
  }

  private generateFileName(campaignName: string, uploadType: string = 'video'): string {
    const uploadDate = new Date().toISOString().split('T')[0];
    // Generate a unique 8-character ID
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${campaignName}_${uploadDate}_${uploadType}_${uniqueId}.mp4`;
  }

  private async downloadTikTokVideo(videoUrl: string, outputPath: string): Promise<void> {
    console.log('Downloading TikTok video using yt-dlp...');

    try {
      // yt-dlp works with TikTok URLs as well
      await youtubedl(videoUrl, {
        output: outputPath,
        format: 'best[ext=mp4]/best',
        noCheckCertificate: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
      });
      console.log('TikTok video downloaded successfully');
    } catch (error) {
      console.error('yt-dlp error for TikTok:', error);
      throw new Error(`Failed to download TikTok video: ${error}`);
    }
  }

  private async downloadYouTubeVideo(videoUrl: string, outputPath: string): Promise<void> {
    console.log('Downloading YouTube video using yt-dlp...');

    // Extract video ID from embed URL if needed
    let videoId = '';
    if (videoUrl.includes('youtube.com/embed/')) {
      videoId = videoUrl.split('embed/')[1].split('?')[0];
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }

    try {
      await youtubedl(videoUrl, {
        output: outputPath,
        format: 'best[ext=mp4]/best',
        noCheckCertificate: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      });
      console.log('YouTube video downloaded successfully');
    } catch (error) {
      console.error('yt-dlp error:', error);
      throw new Error(`Failed to download YouTube video: ${error}`);
    }
  }

  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  private isTikTokUrl(url: string): boolean {
    return url.includes('tiktok.com') || url.includes('vm.tiktok.com');
  }

  private async downloadRegularVideo(url: string, outputPath: string): Promise<void> {
    console.log('Downloading video from:', url);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });
  }

  async processAndSaveVideo(options: ProcessVideoOptions): Promise<{ driveFile: any; twelveLabsTask?: any }> {
    const {
      videoUrl,
      campaignName,
      campaignFolderId,
      startTime,
      endTime,
      uploadType = 'video'
    } = options;

    // Initialize Google Drive
    await this.googleDrive.initialize();

    // Set refresh token if available
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      await this.googleDrive.setRefreshToken(process.env.GOOGLE_REFRESH_TOKEN);
    }

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

    try {
      // Download the video based on its type
      if (this.isTikTokUrl(videoUrl)) {
        await this.downloadTikTokVideo(videoUrl, inputPath);
      } else if (this.isYouTubeUrl(videoUrl)) {
        await this.downloadYouTubeVideo(videoUrl, inputPath);
      } else {
        await this.downloadRegularVideo(videoUrl, inputPath);
      }

      console.log('Video downloaded, trimming...');

      // Trim the video
      await VideoTrimmer.trimVideo({
        startTime,
        endTime,
        inputPath,
        outputPath
      });

      const fileName = this.generateFileName(campaignName, uploadType);

      console.log('Uploading to Google Drive...');
      const driveFile = await this.googleDrive.uploadVideo(
        outputPath,
        fileName,
        campaignFolderId
      );

      // Try to upload to TwelveLabs if API key is configured
      let twelveLabsTask = null;
      if (process.env.TWELVE_LABS_API_KEY && process.env.TWELVE_LABS_API_KEY !== 'your_twelve_labs_api_key_here') {
        try {
          console.log('Uploading to TwelveLabs...');
          twelveLabsTask = await this.twelveLabs.uploadVideo(
            outputPath,
            fileName
          );
          console.log('TwelveLabs upload status:', twelveLabsTask?.status);
          console.log('TwelveLabs task ID:', twelveLabsTask?.taskId);
        } catch (error: any) {
          console.error('TwelveLabs upload failed (non-critical):', error.message || error);
          // Continue even if TwelveLabs fails - Google Drive upload succeeded
        }
      } else {
        console.log('Skipping TwelveLabs upload - API key not configured');
      }

      // Clean up temp files
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      console.log('Video processing completed successfully');

      return {
        driveFile,
        twelveLabsTask
      };
    } catch (error) {
      console.error('Error processing video:', error);
      // Clean up temp files on error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw error;
    }
  }

  async processVideoFromBuffer(
    buffer: Buffer,
    campaignName: string,
    campaignFolderId: string,
    startTime: number,
    endTime: number,
    uploadType: string = 'video'
  ): Promise<{ driveFile: any; twelveLabsTask?: any }> {
    // Initialize Google Drive
    await this.googleDrive.initialize();

    // Set refresh token if available
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      await this.googleDrive.setRefreshToken(process.env.GOOGLE_REFRESH_TOKEN);
    }

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

    try {
      // Write buffer to file
      fs.writeFileSync(inputPath, buffer);

      // Trim the video
      await VideoTrimmer.trimVideo({
        startTime,
        endTime,
        inputPath,
        outputPath
      });

      const fileName = this.generateFileName(campaignName, uploadType);
      const trimmedBuffer = fs.readFileSync(outputPath);

      // Upload to Google Drive
      const driveFile = await this.googleDrive.uploadVideoFromBuffer(
        trimmedBuffer,
        fileName,
        campaignFolderId
      );

      // Try to upload to TwelveLabs if configured
      let twelveLabsTask = null;
      if (process.env.TWELVE_LABS_API_KEY && process.env.TWELVE_LABS_API_KEY !== 'your_twelve_labs_api_key_here') {
        try {
          twelveLabsTask = await this.twelveLabs.uploadVideo(
            outputPath,
            fileName
          );
        } catch (error) {
          console.error('TwelveLabs upload failed (non-critical):', error);
        }
      }

      // Clean up temp files
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      return {
        driveFile,
        twelveLabsTask
      };
    } catch (error) {
      // Clean up temp files on error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw error;
    }
  }
}