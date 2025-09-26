#!/bin/bash

# Railway setup script to ensure all dependencies are installed
echo "Setting up Railway environment..."

# Check Python installation
echo "Python version:"
python3 --version || echo "Python3 not found"

# Install/upgrade pip
echo "Installing/upgrading pip..."
python3 -m ensurepip --default-pip 2>/dev/null || true
python3 -m pip install --upgrade pip

# Install yt-dlp
echo "Installing yt-dlp..."
python3 -m pip install --upgrade yt-dlp

# Check yt-dlp installation
echo "Checking yt-dlp..."
which yt-dlp && yt-dlp --version || echo "yt-dlp not in PATH"

# Check for yt-dlp in Python bin
PYTHON_BIN=$(python3 -c "import sys; print(sys.prefix + '/bin')")
echo "Python bin directory: $PYTHON_BIN"
if [ -f "$PYTHON_BIN/yt-dlp" ]; then
    echo "Found yt-dlp in Python bin"
    ln -sf "$PYTHON_BIN/yt-dlp" /usr/local/bin/yt-dlp 2>/dev/null || true
fi

# Check ffmpeg installation
echo "Checking ffmpeg..."
which ffmpeg && ffmpeg -version | head -1 || echo "ffmpeg not found"

# List environment for debugging
echo "Environment variables:"
env | grep -E "(PATH|PYTHON|NODE)" | sort

echo "Setup complete!"