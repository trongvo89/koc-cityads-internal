#!/usr/bin/env node

/**
 * AI Livestream Worker
 *
 * Polls the dashboard API for sessions with stream_status="preparing",
 * downloads their section videos, concatenates with ffmpeg, and pushes
 * to the RTMP endpoint.
 *
 * ENV:
 *   DASHBOARD_URL    — e.g. https://koc-cityads-internal.vercel.app
 *   STREAM_SECRET    — matches STREAM_WORKER_SECRET on Vercel
 *   POLL_INTERVAL_MS — default 10000 (10s)
 *   WORKER_ID        — unique worker name, default hostname
 *
 * Requirements:
 *   - Node.js 20+
 *   - ffmpeg installed (apt install ffmpeg / brew install ffmpeg)
 *
 * Usage:
 *   DASHBOARD_URL=https://... STREAM_SECRET=xxx node scripts/stream-worker.mjs
 *
 * Deploy to Railway:
 *   Set start command: node scripts/stream-worker.mjs
 */

import { execSync, spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const DASHBOARD_URL = process.env.DASHBOARD_URL;
const STREAM_SECRET = process.env.STREAM_SECRET;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "10000");
const WORKER_ID = process.env.WORKER_ID || `worker-${randomUUID().slice(0, 8)}`;

if (!DASHBOARD_URL || !STREAM_SECRET) {
  console.error("Missing DASHBOARD_URL or STREAM_SECRET");
  process.exit(1);
}

// Verify ffmpeg is installed
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
} catch {
  console.error("ffmpeg not found. Install it: apt install ffmpeg");
  process.exit(1);
}

let activeStream = null; // { sessionId, process }

async function api(path, options = {}) {
  const res = await fetch(`${DASHBOARD_URL}${path}`, {
    ...options,
    headers: {
      "x-stream-secret": STREAM_SECRET,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res.json();
}

async function reportStatus(sessionId, status, error = null) {
  await api("/api/stream/status", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      stream_status: status,
      stream_worker_id: WORKER_ID,
      error,
    }),
  });
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return dest;
}

async function startStream(sessionId) {
  console.log(`[${WORKER_ID}] Preparing stream for session ${sessionId}`);

  const config = await api(`/api/stream/config/${sessionId}`);
  if (config.error) {
    console.error(`Config error: ${config.error}`);
    await reportStatus(sessionId, "error", config.error);
    return;
  }

  const { video_urls, rtmp_url, stream_key, loop } = config;

  if (!video_urls || video_urls.length === 0) {
    await reportStatus(sessionId, "error", "Kịch bản chưa có video. Tạo video trước khi stream.");
    return;
  }

  if (!rtmp_url || !stream_key) {
    await reportStatus(sessionId, "error", "Thiếu RTMP URL hoặc Stream Key");
    return;
  }

  // Download videos to temp dir
  const workDir = join(tmpdir(), `stream-${sessionId}`);
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

  console.log(`[${WORKER_ID}] Downloading ${video_urls.length} videos...`);
  const localFiles = [];
  for (let i = 0; i < video_urls.length; i++) {
    const dest = join(workDir, `section_${i}.mp4`);
    try {
      await downloadFile(video_urls[i], dest);
      localFiles.push(dest);
      console.log(`  ✓ Section ${i + 1}/${video_urls.length}`);
    } catch (err) {
      console.error(`  ✗ Section ${i + 1}: ${err.message}`);
      await reportStatus(sessionId, "error", `Download lỗi section ${i + 1}: ${err.message}`);
      return;
    }
  }

  // Create ffmpeg concat file
  const concatFile = join(workDir, "concat.txt");
  const concatContent = localFiles.map((f) => `file '${f}'`).join("\n");
  writeFileSync(concatFile, concatContent);

  // Build ffmpeg command
  const rtmpDest = `${rtmp_url}/${stream_key}`;
  const inputArgs = loop
    ? ["-stream_loop", "-1", "-re", "-f", "concat", "-safe", "0", "-i", concatFile]
    : ["-re", "-f", "concat", "-safe", "0", "-i", concatFile];

  const ffmpegArgs = [
    ...inputArgs,
    "-c:v", "libx264", "-preset", "veryfast", "-maxrate", "2500k", "-bufsize", "5000k",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
    "-f", "flv",
    rtmpDest,
  ];

  console.log(`[${WORKER_ID}] Starting ffmpeg stream to ${rtmp_url}...`);
  console.log(`  Loop: ${loop}, Sections: ${localFiles.length}`);

  const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  activeStream = { sessionId, process: ffmpeg, workDir };

  // Report streaming status
  await reportStatus(sessionId, "streaming");

  ffmpeg.stderr.on("data", (data) => {
    const line = data.toString().trim();
    // Only log progress lines (frame=, speed=)
    if (line.includes("frame=") || line.includes("speed=")) {
      process.stdout.write(`\r  ${line.slice(-80)}`);
    }
  });

  ffmpeg.on("close", async (code) => {
    console.log(`\n[${WORKER_ID}] ffmpeg exited with code ${code}`);
    activeStream = null;

    // Check if we stopped it intentionally
    const currentConfig = await api(`/api/stream/config/${sessionId}`);
    if (currentConfig.stream_status === "stopped") {
      console.log(`[${WORKER_ID}] Stream was stopped by user`);
    } else if (code !== 0) {
      await reportStatus(sessionId, "error", `ffmpeg exited with code ${code}`);
    } else {
      await reportStatus(sessionId, "stopped");
    }

    // Cleanup temp files
    try {
      localFiles.forEach((f) => { try { unlinkSync(f); } catch {} });
      try { unlinkSync(concatFile); } catch {}
    } catch {}
  });

  ffmpeg.on("error", async (err) => {
    console.error(`[${WORKER_ID}] ffmpeg error: ${err.message}`);
    activeStream = null;
    await reportStatus(sessionId, "error", `ffmpeg error: ${err.message}`);
  });
}

async function poll() {
  // If already streaming, check if we should stop
  if (activeStream) {
    try {
      const config = await api(`/api/stream/config/${activeStream.sessionId}`);
      if (config.stream_status === "stopped") {
        console.log(`\n[${WORKER_ID}] Stop signal received, killing ffmpeg...`);
        activeStream.process.kill("SIGTERM");
      }
    } catch {}
    return;
  }

  // Look for sessions to stream — find "preparing" status
  // The worker polls the specific session it's responsible for
  // For now, we just wait for manual assignment via dashboard
}

// Main loop
console.log(`\n  ╔══════════════════════════════════╗`);
console.log(`  ║   AI Livestream Stream Worker    ║`);
console.log(`  ╠══════════════════════════════════╣`);
console.log(`  ║  Worker: ${WORKER_ID.padEnd(22)} ║`);
console.log(`  ║  Dashboard: ${DASHBOARD_URL.slice(0, 19).padEnd(19)} ║`);
console.log(`  ║  Poll: ${String(POLL_INTERVAL / 1000).padEnd(2)}s                       ║`);
console.log(`  ╚══════════════════════════════════╝\n`);

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log(`\n[${WORKER_ID}] Shutting down...`);
  if (activeStream) {
    activeStream.process.kill("SIGTERM");
    await reportStatus(activeStream.sessionId, "stopped");
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (activeStream) {
    activeStream.process.kill("SIGTERM");
    await reportStatus(activeStream.sessionId, "stopped");
  }
  process.exit(0);
});

// Listen mode: worker accepts session_id as CLI arg or polls
const targetSession = process.argv[2];

if (targetSession) {
  // Direct mode: stream a specific session
  console.log(`[${WORKER_ID}] Direct mode: streaming session ${targetSession}`);
  await startStream(targetSession);
} else {
  // Poll mode: watch for "preparing" sessions
  console.log(`[${WORKER_ID}] Poll mode: watching for preparing sessions...`);

  setInterval(async () => {
    await poll();
  }, POLL_INTERVAL);

  // Also expose a simple HTTP endpoint for webhooks
  const { createServer } = await import("node:http");
  const port = parseInt(process.env.PORT || "3001");

  createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/start") {
      let body = "";
      for await (const chunk of req) body += chunk;
      try {
        const { session_id } = JSON.parse(body);
        if (!session_id) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "session_id required" }));
          return;
        }
        if (activeStream) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: "Already streaming", active: activeStream.sessionId }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, worker: WORKER_ID }));
        startStream(session_id);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({
        worker: WORKER_ID,
        streaming: !!activeStream,
        session: activeStream?.sessionId ?? null,
      }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  }).listen(port, () => {
    console.log(`[${WORKER_ID}] HTTP endpoint on port ${port}`);
    console.log(`  POST /start  {"session_id": "..."}`);
    console.log(`  GET  /health`);
  });
}
