# ── Stage: production image ──────────────────────────────────────────────────
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests first (layer-cache friendly)
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the rest of the source
COPY . .

# Expose the port the server binds to (falls back to 5000 when PORT is unset)
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
