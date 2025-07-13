# Use Node.js 18 alpine image for smaller size
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build:prod

# Production stage
FROM node:18-alpine AS production

# Install serve globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-p", "8080", "-L"] 