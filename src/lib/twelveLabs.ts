import { TwelveLabs } from 'twelvelabs-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class TwelveLabsService {
  private client: TwelveLabs;
  private indexId?: string;

  constructor() {
    // Initialize the TwelveLabs client with API key
    const apiKey = process.env.TWELVE_LABS_API_KEY || process.env.TL_API_KEY || '';
    if (!apiKey) {
      console.warn('WARNING: TwelveLabs API key not found in environment variables!');
      console.warn('Please set TWELVE_LABS_API_KEY in your environment');
    }
    console.log('Initializing TwelveLabs client with API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');

    this.client = new TwelveLabs({
      apiKey: apiKey
    });
  }

  async getOrCreateIndex(): Promise<string> {
    if (this.indexId) {
      return this.indexId;
    }

    try {
      console.log('Fetching TwelveLabs indexes...');

      // List existing indexes using SDK
      const indexesPage = await this.client.indexes.list();
      const indexes = indexesPage.data;
      console.log('Found indexes:', indexes?.length || 0);

      if (indexes && indexes.length > 0) {
        // Use the first available index
        const firstIndex = indexes[0];
        this.indexId = firstIndex.id!;
        console.log('Using existing TwelveLabs index:', this.indexId, firstIndex.indexName);
        return this.indexId;
      }

      // Create a new index if none exist
      console.log('Creating new TwelveLabs index...');
      const newIndex = await this.client.indexes.create({
        indexName: 'Zeus Videos',
        models: [
          {
            modelName: 'marengo2.7',
            modelOptions: ['visual', 'conversation', 'text_in_video', 'logo']
          }
        ]
      });

      // The response might be directly the index object
      this.indexId = (newIndex as any).id || (newIndex as any)._id || '';
      if (!this.indexId) {
        throw new Error('Failed to create TwelveLabs index - no ID returned');
      }
      console.log('Created TwelveLabs index:', this.indexId);
      return this.indexId;
    } catch (error: any) {
      console.error('Error managing TwelveLabs index:', error.message || error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async uploadVideo(
    videoPath: string,
    fileName: string
  ): Promise<{ taskId: string; indexId: string; status: string }> {
    // Create a temp file with the correct filename
    const tempDir = os.tmpdir();
    const renamedPath = path.join(tempDir, fileName);

    try {
      console.log('Starting TwelveLabs upload for:', fileName);
      console.log('Original video path:', videoPath);

      // Copy the file with the correct filename
      fs.copyFileSync(videoPath, renamedPath);
      console.log('Created renamed file at:', renamedPath);

      // Ensure we have an index
      const indexId = await this.getOrCreateIndex();

      // Create a task for video upload using the SDK
      console.log('Creating upload task for index:', indexId);

      // Create a read stream from the renamed file
      const videoStream = fs.createReadStream(renamedPath);

      // Create task with custom metadata including the filename
      const task = await this.client.tasks.create({
        indexId: indexId,
        videoFile: videoStream,
        // Pass the filename as metadata to maintain naming convention
        userMetadata: JSON.stringify({
          originalFileName: fileName,
          uploadDate: new Date().toISOString()
        })
      });

      console.log('Task create response:', JSON.stringify(task, null, 2));

      // The response might have different property names
      const taskId = (task as any).id || (task as any)._id || (task as any).taskId;
      if (!taskId) {
        console.error('No task ID found in response:', task);
        throw new Error('Failed to get task ID from TwelveLabs response');
      }
      console.log('TwelveLabs upload task created:', taskId);

      // Monitor the task status (don't wait too long)
      const status = await this.waitForTask(taskId, 30000);

      return {
        taskId: taskId,
        indexId: indexId,
        status: status
      };
    } catch (error: any) {
      console.error('Error uploading to TwelveLabs:', error.message || error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    } finally {
      // Clean up the renamed file
      if (fs.existsSync(renamedPath)) {
        fs.unlinkSync(renamedPath);
        console.log('Cleaned up renamed file');
      }
    }
  }

  async waitForTask(taskId: string, maxWaitTime: number = 30000): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const task = await this.client.tasks.retrieve(taskId);
        console.log('Task response:', JSON.stringify(task, null, 2));

        // The response might be directly the task object, not wrapped in body
        const taskStatus = (task as any).status || (task as any).body?.status;
        const hlsStatus = (task as any).hls?.status;
        console.log('Task status:', taskStatus);
        console.log('HLS status:', hlsStatus);

        // Check both task status and HLS status for completion
        if (taskStatus === 'ready' || taskStatus === 'completed' || hlsStatus === 'COMPLETE') {
          console.log('TwelveLabs task completed:', taskId);
          console.log('Video ID:', (task as any).videoId);
          return 'completed';
        } else if (taskStatus === 'failed') {
          console.error('TwelveLabs task failed:', taskId);
          if ((task as any).message) {
            console.error('Failure message:', (task as any).message);
          }
          return 'failed';
        }

        // Wait 3 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error: any) {
        console.error('Error checking task status:', error.message || error);
        if (error.response?.data) {
          console.error('Error response:', JSON.stringify(error.response.data, null, 2));
        }
        return 'error';
      }
    }

    console.log('TwelveLabs task still processing, continuing in background:', taskId);
    return 'processing';
  }

  async searchVideos(query: string, indexId?: string): Promise<any> {
    try {
      const searchIndexId = indexId || this.indexId || await this.getOrCreateIndex();

      const results = await this.client.search.query({
        indexId: searchIndexId,
        queryText: query,
        searchOptions: ['visual', 'audio']
      });

      return results.data;
    } catch (error: any) {
      console.error('Error searching videos:', error.message || error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
}

export default TwelveLabsService;