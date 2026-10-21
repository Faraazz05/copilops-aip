# ==============================================================================
# Multi-Stage Dockerfile for CopilOPS Aeronautical Data Platform
# Author: Mohd Faraz (https://faraazz05.github.io)
# Serves both Node.js Express API and React TypeScript Single Page Application
# ==============================================================================

# --- Stage 1: Build Frontend (React + TypeScript + Vite) ---
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
# Provide the dataset for client static bundling
COPY server/data/aeronautical_data.json /app/server/data/aeronautical_data.json
RUN npm run build

# --- Stage 2: Build Backend (Node.js + Express + TypeScript) ---
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# --- Stage 3: Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy compiled backend
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/data ./server/data

# Copy compiled frontend into client/dist for Express static serving
COPY --from=client-builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 5000

# Start Express server (serves /api and SPA at root)
CMD ["node", "dist/index.js"]
