# Build stage
from oven/bun:latest as builder
workdir /app

# Copy package files
copy package.json bun.lockb* ./

# Install dependencies
run bun install --frozen-lockfile

# Copy source code
copy src ./src
copy tsconfig.json ./

# Production stage
from oven/bun:latest
workdir /app

# Install dumb-init for proper signal handling
run apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Copy dependencies and built artifacts from builder
copy --from=builder /app/node_modules ./node_modules
copy --from=builder /app/package.json ./
copy --from=builder /app/bun.lockb* ./

# Copy source code
copy src ./src
copy tsconfig.json ./

# Expose the port
expose 5000

# Health check
healthcheck --interval=30s --timeout=10s --start-period=5s --retries=3 \
  cmd bun -e "console.log(await fetch('http://localhost:5000').then(r => r.ok ? 'OK' : 'FAIL'))" || exit 1

# Use dumb-init to handle signals properly
entrypoint ["dumb-init", "--"]

# Run the server
cmd ["bun", "--watch", "src/server.ts"]
