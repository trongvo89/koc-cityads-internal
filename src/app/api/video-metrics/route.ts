import { NextResponse } from "next/server";

// Normalise various short/long TikTok URL formats.
// tikwm.com handles redirect following for vm.tiktok.com / vt.tiktok.com / short URLs.
function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url);
}

async function fetchTikTokMetrics(videoUrl: string) {
  // tikwm.com: unofficial TikTok data API, free, no auth required.
  // Returns play_count / digg_count / comment_count / share_count.
  const endpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&web=1`;

  const res = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    // Cache for 1 hour — metrics don't change that fast.
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`tikwm returned ${res.status}`);

  const json = await res.json();

  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg ?? "Video not found or private");
  }

  const d = json.data;
  return {
    video_views: d.play_count ?? null,
    video_likes: d.digg_count ?? null,
    video_comments: d.comment_count ?? null,
    video_shares: d.share_count ?? null,
    author: d.author?.nickname ?? null,
  };
}

async function fetchInstagramMetrics(_videoUrl: string) {
  // Instagram removed public metrics API in 2019.
  // Without an authenticated Graph API token for the post owner we cannot
  // retrieve engagement stats — return null fields so UI stays editable.
  return {
    video_views: null,
    video_likes: null,
    video_comments: null,
    video_shares: null,
    author: null,
    _warning: "Instagram metrics require Graph API authentication — not supported",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing ?url parameter" }, { status: 400 });
  }

  try {
    if (isTikTokUrl(videoUrl)) {
      const metrics = await fetchTikTokMetrics(videoUrl);
      return NextResponse.json(metrics);
    }

    if (isInstagramUrl(videoUrl)) {
      const metrics = await fetchInstagramMetrics(videoUrl);
      return NextResponse.json(metrics);
    }

    return NextResponse.json(
      { error: "Unsupported platform — only TikTok is supported" },
      { status: 422 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
