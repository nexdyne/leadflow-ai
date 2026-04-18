FROM node:22-alpine AS build

WORKDIR /app

# Copy package files for dependency install
COPY package.json package-lock.json ./
RUN npm ci

# Copy server package files
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server
COPY --from=build /app/server ./server

# Install production server dependencies only
RUN cd server && npm ci --omit=dev

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server/server.js"]
