# ── Stage: production ────────────────────────────────────────
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests first for optimal layer caching.
# The npm install layer is only rebuilt when these files change.
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the rest of the application source
COPY . .

# Expose the port the Express server listens on
EXPOSE 5000

# Start the server (matches "start" script in package.json)
CMD ["npm", "start"]
