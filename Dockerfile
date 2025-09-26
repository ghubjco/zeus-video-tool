# Use Node.js 18 as base image
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    bash

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp || pip3 install yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Verify installations
RUN which yt-dlp && yt-dlp --version || echo "yt-dlp not found"
RUN which ffmpeg && ffmpeg -version | head -1 || echo "ffmpeg not found"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]