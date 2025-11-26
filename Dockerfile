# -------- BASE IMAGE --------
FROM node:20-bullseye-slim

WORKDIR /app

# -------- INSTALL DEPENDENCIES FOR API AND UI --------
# Copy package.json files first for caching
COPY calendar-api/package*.json ./calendar-api/
COPY calendar-ui/package*.json ./calendar-ui/

# Install backend deps
RUN cd calendar-api && npm install --no-audit --no-fund

# Install frontend deps
RUN cd calendar-ui && npm install --no-audit --no-fund

# -------- COPY FULL PROJECT --------
COPY . .

# -------- BUILD FRONTEND --------
RUN cd calendar-ui && npm run build

# Copy built UI into backend public folder
RUN mkdir -p calendar-api/public && \
    cp -r calendar-ui/dist/* calendar-api/public/

# -------- EXPOSE API PORT --------
EXPOSE 3001

ENV NODE_ENV=production

# -------- START ONLY BACKEND --------
# Backend must serve both:
#   /api/* → API
#   all other routes → UI static files
CMD ["npm", "--prefix", "calendar-api", "run", "start"]
