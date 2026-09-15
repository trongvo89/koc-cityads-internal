# Stream worker image — Node 20 + ffmpeg. Runs the AI Livestream worker that
# assembles each session's video (image + voice-over) and pushes it to RTMP.
#
# The worker (scripts/stream-worker.mjs) is standalone: it only uses Node
# builtins + fetch + the ffmpeg binary, so no `npm install` is needed.
#
# Build context = repo root. On Railway/Render/Fly, set the Dockerfile path to
# deploy/worker/Dockerfile and provide env: DASHBOARD_URL, STREAM_SECRET,
# (optional) POLL_INTERVAL_MS, WORKER_ID.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/stream-worker.mjs ./stream-worker.mjs

# Poll mode: watches for "preparing" sessions and also exposes /health, /start.
CMD ["node", "stream-worker.mjs"]
