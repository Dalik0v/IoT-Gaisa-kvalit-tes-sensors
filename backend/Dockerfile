# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built JavaScript from build stage
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production

# Start the app
CMD ["npm", "start"]