## Dockerfile to run backend (calendar-api) and frontend (calendar-ui) together
# - does NOT modify project startup scripts
# - installs dependencies for both sub-projects
# - starts backend via `npm start` and frontend via `npm run dev -- --host 0.0.0.0`

FROM node:20-bullseye-slim

WORKDIR /app

# copy package jsons first to leverage docker cache for installs
COPY calendar-api/package*.json ./calendar-api/
COPY calendar-ui/package*.json ./calendar-ui/
COPY package.json ./

# install dependencies for both subprojects (dev deps required for Vite)
RUN cd calendar-api && npm install --no-audit --no-fund && \
    cd ../calendar-ui && npm install --no-audit --no-fund

# copy full project
COPY . .

# Expose backend and Vite dev server ports
EXPOSE 3001 5173

ENV NODE_ENV=development

# Start API and UI together. We keep existing npm scripts unchanged.
# We pass `-- --host 0.0.0.0` to the UI npm script so Vite prints usable network links in the container logs.
CMD ["sh", "-c", "npm --prefix ./calendar-api run start & npm --prefix ./calendar-ui run dev -- --host 0.0.0.0"]