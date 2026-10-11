# Multi-stage build for DocuFlow
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source files
COPY . .

# Build the client bundle
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /opt/docuflow

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_DIR=/srv/files/DocuFlow

# Install production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY server ./server
COPY tsconfig.json ./

# Install tsx globally or locally to execute server.ts in Node
RUN npm install -g tsx

# Expose server port
EXPOSE 3000

# Start server
CMD ["tsx", "server.ts"]
