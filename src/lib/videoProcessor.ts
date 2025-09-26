import { GoogleDriveService } from './googleDrive';
import { VideoTrimmer } from './videoTrimmer';
import { TwelveLabsService } from './twelveLabs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import youtubedl from 'youtube-dl-exec';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    // Log environment for debugging
    console.log('VideoProcessor initialized. Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      hasGoogleCredentials: !!process.env.GOOGLE_CLIENT_ID,
      hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      hasTwelveLabsKey: !!process.env.TWELVE_LABS_API_KEY || !!process.env.TL_API_KEY,
      tmpDir: os.tmpdir()
    });

    // Check for yt-dlp availability
    this.checkYtdlpAvailability();
  }

  private async checkYtdlpAvailability(): Promise<void> {
    try {
      const { stdout } = await execAsync('which yt-dlp');
      console.log('yt-dlp found at:', stdout.trim());

      const { stdout: version } = await execAsync('yt-dlp --version');
      console.log('yt-dlp version:', version.trim());
    } catch (error) {
      console.error('yt-dlp not found in system PATH');
      console.error('Will attempt to use embedded youtube-dl-exec');
    }
  }

  private generateFileName(campaignName: string, uploadType: string = 'video'): string {
    const uploadDate = new Date().toISOString().split('T')[0];
    // Generate a unique 8-character ID
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${campaignName}_${uploadDate}_${uploadType}_${uniqueId}.mp4`;
  }

  private async downloadTikTokVideo(videoUrl: string, outputPath: string): Promise<void> {
    console.log('Downloading TikTok video using yt-dlp...');
    console.log('URL:', videoUrl);
    console.log('Output path:', outputPath);

    try {
      // yt-dlp works with TikTok URLs as well
      const ytdlOptions: any = {
        output: outputPath,
        format: 'best[ext=mp4]/best',
        noCheckCertificate: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
      };

      // Check for yt-dlp paths
      const possiblePaths = [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        '/app/.heroku/python/bin/yt-dlp',
        '/opt/venv/bin/yt-dlp'
      ];

      if (process.env.RAILWAY_ENVIRONMENT) {
        console.log('Railway environment detected, checking yt-dlp paths...');
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            console.log(`Found yt-dlp at: ${path}`);
            ytdlOptions.youtubeDlPath = path;
            break;
          }
        }
        if (!ytdlOptions.youtubeDlPath) {
          console.log('yt-dlp not found in standard paths, using default');
        }
      }

      console.log('yt-dlp options:', JSON.stringify(ytdlOptions, null, 2));

      try {
        await youtubedl(videoUrl, ytdlOptions);
      } catch (ytdlError: any) {
        console.error('youtube-dl-exec failed:', ytdlError.message);
        console.error('Trying direct yt-dlp command...');

        try {
          // Fallback to direct yt-dlp command
          const command = `yt-dlp -f 'best[ext=mp4]/best' -o '${outputPath}' '${videoUrl}'`;
          console.log('Running command:', command);

          const { stdout, stderr } = await execAsync(command);
          console.log('yt-dlp stdout:', stdout);
          if (stderr) console.error('yt-dlp stderr:', stderr);
        } catch (cmdError: any) {
          console.error('Direct yt-dlp command also failed:', cmdError.message);

          // Last resort: try to download directly if it's a direct video URL
          if (videoUrl.includes('.mp4') || videoUrl.includes('.mov')) {
            console.log('Attempting direct HTTP download as last resort...');
            await this.downloadRegularVideo(videoUrl, outputPath);
          } else {
            throw new Error(`All download methods failed. Original error: ${ytdlError.message}`);
          }
        }
      }
      console.log('TikTok video downloaded successfully');

      // Verify file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Video file was not created at expected path');
      }

      const stats = fs.statSync(outputPath);
      console.log(`Downloaded file size: ${stats.size} bytes`);
    } catch (error: any) {
      console.error('yt-dlp error for TikTok:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error message:', error?.message);
      throw new Error(`Failed to download TikTok video: ${error?.message || error}`);
    }
  }

  private async downloadYouTubeVideo(videoUrl: string, outputPath: string): Promise<void> {
    console.log('Downloading YouTube video using yt-dlp...');
    console.log('Original URL:', videoUrl);

    // Extract video ID from embed URL if needed
    let videoId = '';
    if (videoUrl.includes('youtube.com/embed/')) {
      videoId = videoUrl.split('embed/')[1].split('?')[0];
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log('Converted embed URL to:', videoUrl);
    }

    try {
      const ytdlOptions: any = {
        output: outputPath,
        format: 'best[ext=mp4]/best',
        noCheckCertificate: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      };

      // Check for yt-dlp paths
      const possiblePaths = [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        '/app/.heroku/python/bin/yt-dlp',
        '/opt/venv/bin/yt-dlp'
      ];

      if (process.env.RAILWAY_ENVIRONMENT) {
        console.log('Railway environment detected, checking yt-dlp paths...');
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            console.log(`Found yt-dlp at: ${path}`);
            ytdlOptions.youtubeDlPath = path;
            break;
          }
        }
        if (!ytdlOptions.youtubeDlPath) {
          console.log('yt-dlp not found in standard paths, using default');
        }
      }

      console.log('yt-dlp options:', JSON.stringify(ytdlOptions, null, 2));

      try {
        await youtubedl(videoUrl, ytdlOptions);
      } catch (ytdlError: any) {
        console.error('youtube-dl-exec failed:', ytdlError.message);
        console.error('Trying direct yt-dlp command...');

        try {
          // Fallback to direct yt-dlp command
          const command = `yt-dlp -f 'best[ext=mp4]/best' -o '${outputPath}' '${videoUrl}'`;
          console.log('Running command:', command);

          const { stdout, stderr } = await execAsync(command);
          console.log('yt-dlp stdout:', stdout);
          if (stderr) console.error('yt-dlp stderr:', stderr);
        } catch (cmdError: any) {
          console.error('Direct yt-dlp command also failed:', cmdError.message);

          // Last resort: try to download directly if it's a direct video URL
          if (videoUrl.includes('.mp4') || videoUrl.includes('.mov')) {
            console.log('Attempting direct HTTP download as last resort...');
            await this.downloadRegularVideo(videoUrl, outputPath);
          } else {
            throw new Error(`All download methods failed. Original error: ${ytdlError.message}`);
          }
        }
      }
      console.log('YouTube video downloaded successfully');

      // Verify file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Video file was not created at expected path');
      }

      const stats = fs.statSync(outputPath);
      console.log(`Downloaded file size: ${stats.size} bytes`);
    } catch (error: any) {
      console.error('yt-dlp error:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error message:', error?.message);
      throw new Error(`Failed to download YouTube video: ${error?.message || error}`);
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

    // Use /tmp directly on Railway, fallback to os.tmpdir()
    const tempDir = process.env.RAILWAY_ENVIRONMENT ? '/tmp' : os.tmpdir();
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `output_${timestamp}.mp4`);

    console.log('Using temp directory:', tempDir);
    console.log('Temp directory exists:', fs.existsSync(tempDir));

    try {
      fs.accessSync(tempDir, fs.constants.W_OK);
      console.log('Temp directory is writable');
    } catch (err) {
      console.error('Temp directory is NOT writable:', err);
      throw new Error(`Temp directory ${tempDir} is not writable`);
    }

    try {
      console.log('Processing video from URL:', videoUrl);
      console.log('Input path:', inputPath);
      console.log('Output path:', outputPath);

      // Download the video based on its type
      if (this.isTikTokUrl(videoUrl)) {
        console.log('Detected TikTok URL');
        await this.downloadTikTokVideo(videoUrl, inputPath);
      } else if (this.isYouTubeUrl(videoUrl)) {
        console.log('Detected YouTube URL');
        await this.downloadYouTubeVideo(videoUrl, inputPath);
      } else {
        console.log('Detected regular video URL');
        await this.downloadRegularVideo(videoUrl, inputPath);
      }

      console.log('Video downloaded successfully');

      // Check if file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Downloaded file not found at ${inputPath}`);
      }

      const stats = fs.statSync(inputPath);
      console.log(`Downloaded file size: ${stats.size} bytes`);
      console.log('Starting video trim...');

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
      const tlApiKey = process.env.TWELVE_LABS_API_KEY || process.env.TL_API_KEY;
      console.log('TwelveLabs API key check:', tlApiKey ? 'Found (length: ' + tlApiKey.length + ')' : 'NOT FOUND');

      if (tlApiKey && tlApiKey.startsWith('tlk_')) {
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
          console.error('Full error:', error);
          // Continue even if TwelveLabs fails - Google Drive upload succeeded
        }
      } else {
        console.log('Skipping TwelveLabs upload - API key not configured or invalid');
        console.log('Expected format: tlk_...');
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

    // Use /tmp directly on Railway, fallback to os.tmpdir()
    const tempDir = process.env.RAILWAY_ENVIRONMENT ? '/tmp' : os.tmpdir();
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `output_${timestamp}.mp4`);

    console.log('Using temp directory:', tempDir);
    console.log('Temp directory exists:', fs.existsSync(tempDir));

    try {
      fs.accessSync(tempDir, fs.constants.W_OK);
      console.log('Temp directory is writable');
    } catch (err) {
      console.error('Temp directory is NOT writable:', err);
      throw new Error(`Temp directory ${tempDir} is not writable`);
    }

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
      const tlApiKey = process.env.TWELVE_LABS_API_KEY || process.env.TL_API_KEY;

      if (tlApiKey && tlApiKey.startsWith('tlk_')) {
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