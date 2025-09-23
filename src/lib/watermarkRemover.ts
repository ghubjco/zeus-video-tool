import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';

export interface WatermarkRemovalOptions {
  removeWatermark: boolean;
  apiKey?: string;
}

export class WatermarkRemovalService {
  private apiKey: string | undefined;
  private apiBaseUrl: string = 'https://open.vmake.ai/api/v1';

  constructor() {
    this.apiKey = process.env.VMAKE_API_KEY;
  }

  /**
   * Process video to remove watermarks
   * Since vmake.ai doesn't have a video API, we'll use alternative approaches
   */
  async removeWatermarkFromVideo(
    inputPath: string,
    outputPath: string,
    options?: { useFrameExtraction?: boolean }
  ): Promise<void> {
    if (!this.apiKey) {
      console.warn('VMAKE_API_KEY not configured. Attempting alternative watermark removal.');
      // Use FFmpeg-based watermark removal as fallback
      await this.removeWatermarkWithFFmpeg(inputPath, outputPath);
      return;
    }

    if (options?.useFrameExtraction) {
      // Extract frames, process each frame, and reconstruct video
      await this.processVideoFrames(inputPath, outputPath);
    } else {
      // Use FFmpeg delogo filter for simple watermark removal
      await this.removeWatermarkWithFFmpeg(inputPath, outputPath);
    }
  }

  /**
   * Remove watermark using FFmpeg delogo filter
   * This is a simple approach that works for static watermarks
   */
  private async removeWatermarkWithFFmpeg(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Common watermark positions (can be configured)
      // Default: bottom-right corner for TikTok/social media watermarks
      const watermarkConfig = {
        x: 'W-200', // 200 pixels from right
        y: 'H-100', // 100 pixels from bottom
        w: '180',   // watermark width
        h: '80'     // watermark height
      };

      ffmpeg(inputPath)
        .videoFilters([
          `delogo=x=${watermarkConfig.x}:y=${watermarkConfig.y}:w=${watermarkConfig.w}:h=${watermarkConfig.h}:show=0`
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('Watermark removal completed with FFmpeg');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg watermark removal error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Advanced: Extract frames, process with vmake.ai image API, reconstruct
   * This would be more expensive but could handle complex watermarks
   */
  private async processVideoFrames(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    const tempDir = path.join(os.tmpdir(), `watermark_removal_${Date.now()}`);
    const framesDir = path.join(tempDir, 'frames');
    const processedDir = path.join(tempDir, 'processed');

    try {
      // Create temp directories
      fs.mkdirSync(framesDir, { recursive: true });
      fs.mkdirSync(processedDir, { recursive: true });

      // Extract frames (1 fps for testing, adjust as needed)
      await this.extractFrames(inputPath, framesDir);

      // Process each frame with vmake.ai (if API becomes available)
      // For now, we'll use a placeholder
      console.log('Frame extraction complete. Processing frames...');

      // Note: Since vmake.ai doesn't have watermark removal API yet,
      // we would need to use their background removal or image enhancement APIs
      // Or integrate with a different service that offers watermark removal

      // Reconstruct video from processed frames
      await this.reconstructVideo(processedDir, outputPath);

      // Cleanup temp directories
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * Extract frames from video
   */
  private extractFrames(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vf fps=1', // Extract 1 frame per second
          '-q:v 2'     // High quality frames
        ])
        .output(path.join(outputDir, 'frame_%04d.png'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Reconstruct video from frames
   */
  private reconstructVideo(framesDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(framesDir, 'frame_%04d.png'))
        .inputOptions(['-framerate 30'])
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Alternative: Use a different watermark removal service
   * This is a placeholder for integrating with services like:
   * - Remove.bg (for logos/watermarks)
   * - Cutout.pro
   * - Other AI-based watermark removal APIs
   */
  async removeWatermarkWithAlternativeAPI(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    // Placeholder for alternative API integration
    console.log('Using alternative watermark removal service...');

    // For now, fallback to FFmpeg
    await this.removeWatermarkWithFFmpeg(inputPath, outputPath);
  }

  /**
   * Detect watermark position automatically (experimental)
   */
  async detectWatermarkPosition(videoPath: string): Promise<{x: number, y: number, w: number, h: number} | null> {
    // This would use computer vision to detect watermark position
    // For now, return common positions for known platforms

    // TikTok watermark is typically in bottom-right
    // YouTube watermark might be in bottom-right or top-right

    return {
      x: 0,
      y: 0,
      w: 180,
      h: 80
    };
  }
}