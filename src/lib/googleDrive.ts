import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleDriveService {
  private drive: any;
  private auth: OAuth2Client | null = null;
  private initialized: boolean = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Create OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
      );

      // Check if we have stored tokens
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if (refreshToken) {
        this.auth.setCredentials({
          refresh_token: refreshToken
        });
      }

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing Google Drive service:', error);
      throw error;
    }
  }

  async getAuthUrl() {
    await this.initialize();

    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file'
    ];

    return this.auth!.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async setCredentials(code: string) {
    await this.initialize();

    const { tokens } = await this.auth!.getToken(code);
    this.auth!.setCredentials(tokens);

    // Return refresh token to be saved
    return tokens;
  }

  async setRefreshToken(refreshToken: string) {
    await this.initialize();
    this.auth!.setCredentials({
      refresh_token: refreshToken
    });
  }

  async listCampaigns(parentFolderId?: string) {
    await this.initialize();

    try {
      const query = parentFolderId
        ? `mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
        : `mimeType='application/vnd.google-apps.folder' and '${process.env.GOOGLE_DRIVE_FOLDER_ID || ''}' in parents and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        orderBy: 'name',
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing campaigns:', error);
      throw error;
    }
  }

  async createCampaignFolder(name: string) {
    await this.initialize();

    const fileMetadata: any = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    // Add parent folder if specified
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
    }

    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name',
      });
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async uploadVideo(
    filePath: string,
    fileName: string,
    folderId: string,
    mimeType: string = 'video/mp4'
  ) {
    await this.initialize();

    const fs = require('fs');
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };

    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  async uploadVideoFromBuffer(
    buffer: Buffer,
    fileName: string,
    folderId: string,
    mimeType: string = 'video/mp4'
  ) {
    await this.initialize();

    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading video from buffer:', error);
      throw error;
    }
  }

  async ensureRootFolder() {
    await this.initialize();

    const folderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Zeus Videos';

    try {
      // Check if folder exists
      const response = await this.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create folder if it doesn't exist
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error ensuring root folder:', error);
      throw error;
    }
  }
}

export default GoogleDriveService;