import React, { useState, useRef, useEffect } from 'react';
import { VideoDetector, VideoType, VideoInfo } from '@/lib/videoDetector';
import axios from 'axios';

interface Campaign {
  id: string;
  name: string;
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/status');
      setIsAuthenticated(response.data.authenticated);
      if (response.data.authenticated) {
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get('/api/campaigns');
      setCampaigns(response.data);
      if (response.data.length > 0) {
        setSelectedCampaign(response.data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        setMessage('Authentication required. Please authenticate with Google Drive.');
      } else {
        setMessage('Error fetching campaigns. Check your configuration.');
      }
    }
  };

  const handleAuth = async () => {
    try {
      const response = await axios.get('/api/auth/url');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setMessage('Error starting authentication. Check your Google OAuth credentials.');
    }
  };

  const handleFindVideo = async () => {
    if (!videoUrl) {
      setMessage('Please enter a video URL');
      return;
    }

    const info = VideoDetector.detectVideoType(videoUrl);
    setVideoInfo(info);

    if (info.type === VideoType.YOUTUBE && info.embedUrl) {
      setVideoSrc(info.embedUrl);
    } else if (info.type === VideoType.RAW) {
      setVideoSrc(info.url);
    } else if (info.type === VideoType.TIKTOK) {
      // For TikTok, we'll send the URL directly to the backend
      // The backend will handle downloading with yt-dlp
      setVideoSrc(videoUrl);
      setMessage('TikTok video detected. It will be downloaded when you save.');
      // Set default trim times for TikTok since we can't preview
      setStartTime(0);
      setEndTime(60); // Default to 60 seconds
      setVideoDuration(60);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setEndTime(duration);
    }
  };

  const handleSaveTrim = async () => {
    if (!selectedCampaign || !videoSrc) {
      setMessage('Please select a campaign and load a video');
      return;
    }

    setIsProcessing(true);
    setMessage('Processing video...');

    try {
      const response = await axios.post('/api/video/process', {
        videoUrl: videoSrc,
        campaignName: selectedCampaign.name,
        campaignFolderId: selectedCampaign.id,
        startTime,
        endTime,
        uploadType: videoInfo?.type || 'video'
      });

      setMessage(`Video saved successfully! Drive ID: ${response.data.driveFile.id}`);

      // Reset for next video
      setVideoUrl('');
      setVideoInfo(null);
      setVideoSrc('');
      setStartTime(0);
      setEndTime(0);
      setVideoDuration(0);
    } catch (error) {
      console.error('Error processing video:', error);
      setMessage('Error processing video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      if (currentTime < startTime || currentTime > endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const handleCreateCampaign = async () => {
    const name = prompt('Enter campaign name:');
    if (!name) return;

    try {
      const response = await axios.post('/api/campaigns', { name });
      await fetchCampaigns();
      setSelectedCampaign(response.data);
      setMessage(`Campaign "${name}" created successfully!`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setMessage('Error creating campaign');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Zeus...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md">
          <h1 className="text-3xl font-bold text-white mb-6">Zeus Video Tool</h1>
          <p className="text-gray-300 mb-6">
            To get started, you need to authenticate with Google Drive.
          </p>

          <div className="bg-blue-900 p-4 rounded mb-6">
            <p className="text-blue-200 text-sm mb-2">
              <strong>Before authenticating:</strong>
            </p>
            <ol className="text-blue-200 text-sm list-decimal list-inside space-y-1">
              <li>Create OAuth2 credentials in Google Cloud Console</li>
              <li>Add Client ID and Secret to .env.local</li>
              <li>Enable Google Drive API</li>
            </ol>
          </div>

          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded"
          >
            Connect Google Drive
          </button>

          {message && (
            <div className="mt-4 p-3 bg-red-900 text-red-200 rounded">
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Zeus Video Tool</h1>

        {/* Campaign Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-white font-medium">Campaign:</label>
            <div className="flex gap-2">
              <select
                value={selectedCampaign?.id || ''}
                onChange={(e) => {
                  const campaign = campaigns.find(c => c.id === e.target.value);
                  setSelectedCampaign(campaign || null);
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded"
              >
                <option value="">Select Campaign</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateCampaign}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                New Campaign
              </button>
              {selectedCampaign && (
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Change Campaign
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Video Input */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="text-white font-medium block mb-2">Video URL:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Enter TikTok, YouTube, or video URL..."
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded"
              />
              <button
                onClick={handleFindVideo}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Find Video
              </button>
            </div>
          </div>

          {/* Video Preview and Trimming */}
          {videoSrc && (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                {videoInfo?.type === VideoType.YOUTUBE ? (
                  <iframe
                    src={videoSrc}
                    className="w-full h-96 rounded"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : videoInfo?.type === VideoType.TIKTOK ? (
                  <div className="w-full h-96 rounded bg-gray-800 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="bg-gray-700 rounded-lg p-6">
                        <p className="text-white text-sm font-medium mb-2">TikTok Video Ready for Processing</p>
                        <p className="text-gray-400 text-xs mb-3">
                          The video will be downloaded when you save
                        </p>
                        <div className="bg-gray-900 rounded p-3">
                          <p className="text-gray-300 text-xs break-all">{videoUrl}</p>
                        </div>
                        <p className="text-gray-500 text-xs mt-3">
                          Adjust trim times below (default: 0-60 seconds)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    className="w-full h-96 rounded"
                    onLoadedMetadata={handleVideoLoaded}
                    onTimeUpdate={handleTimeUpdate}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-medium block mb-2">
                    Start Time (seconds):
                  </label>
                  <input
                    type="number"
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded"
                  />
                </div>
                <div>
                  <label className="text-white font-medium block mb-2">
                    End Time (seconds):
                  </label>
                  <input
                    type="number"
                    value={endTime}
                    onChange={(e) => setEndTime(Number(e.target.value))}
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveTrim}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded"
              >
                {isProcessing ? 'Processing...' : 'Save Trim'}
              </button>
            </div>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-white">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}