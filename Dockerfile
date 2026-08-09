# Dockerfile for Railway deployment with Node.js 20 & Python 3 demoparser2
FROM node:20-bullseye

# Install Python 3, pip, and build essentials for demoparser2
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for CS2 demo parsing
RUN pip3 install --no-cache-dir demoparser2 curl_cffi

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm ci

# Copy project source files
COPY . .

# Set production env and build Next.js app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

# Expose server port
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Launch Next.js production server
CMD ["npm", "start"]
