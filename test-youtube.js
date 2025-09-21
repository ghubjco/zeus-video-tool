const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

async function testYouTubeDownload() {
  const outputPath = path.join(__dirname, 'test-video.mp4');

  console.log('Testing YouTube download...');

  try {
    // Test with a short YouTube video
    await youtubedl('https://www.youtube.com/watch?v=aqz-KE-bpKQ', {
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

    // Check if file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ YouTube download successful!');
      console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Clean up test file
      fs.unlinkSync(outputPath);
      console.log('   Test file cleaned up');
    } else {
      console.log('❌ Download failed - file not created');
    }
  } catch (error) {
    console.error('❌ YouTube download error:', error.message);
    console.error('   Full error:', error);
  }
}

testYouTubeDownload();