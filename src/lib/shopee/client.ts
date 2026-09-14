import { createHmac } from "crypto";

/**
 * Shopee Open Platform API v2 — low-level signed-request client.
 *
 * Scope of this file: the parts that are STABLE and documented — request
 * signing (HMAC-SHA256), the common-parameter layout, and host selection.
 * It has no Shopee credentials of its own; callers pass shop tokens in.
 *
 * ⚠️ The livestream/product endpoint PATHS in `SHOPEE_PATHS` below are taken
 * from a community SDK that mirrors the v2 API and are NOT yet verified
 * against Shopee's official portal (blocked until we have a partner account).
 * Re-confirm every livestream/product path in open.shopee.com/documents
 * before relying on it in production. The auth + signing mechanics here are
 * documented and standard.
 *
 * Signing spec (Shopee v2):
 *   - shop-scoped API base string: partner_id + path + timestamp + access_token + shop_id
 *   - public API   base string:    partner_id + path + timestamp
 *   - sign = HMAC-SHA256(base, partner_key) as lowercase hex
 *   - timestamp = unix seconds
 */

const PROD_HOST = "https://partner.shopeemobile.com";
const SANDBOX_HOST = "https://partner.test-stable.shopeemobile.com";

export type ShopeeConfig = {
  partnerId: string;
  partnerKey: string;
  host: string;
};

/** Read Shopee app credentials from env. Throws if unconfigured (never guess). */
export function getShopeeConfig(): ShopeeConfig {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  if (!partnerId || !partnerKey) {
    throw new Error(
      "Shopee chưa cấu hình: cần SHOPEE_PARTNER_ID và SHOPEE_PARTNER_KEY trong env."
    );
  }
  const host =
    process.env.SHOPEE_HOST ??
    (process.env.SHOPEE_ENV === "sandbox" ? SANDBOX_HOST : PROD_HOST);
  return { partnerId, partnerKey, host };
}

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build the base string and HMAC-SHA256 signature for a request.
 * Pass `shop` for shop-scoped APIs; omit it for public/auth APIs.
 */
export function signRequest(
  cfg: ShopeeConfig,
  apiPath: string,
  timestamp: number,
  shop?: { accessToken: string; shopId: string | number }
): string {
  const base = shop
    ? `${cfg.partnerId}${apiPath}${timestamp}${shop.accessToken}${shop.shopId}`
    : `${cfg.partnerId}${apiPath}${timestamp}`;
  return createHmac("sha256", cfg.partnerKey).update(base).digest("hex");
}

/** Build a fully-signed request URL (common params in the query string). */
export function buildSignedUrl(
  cfg: ShopeeConfig,
  apiPath: string,
  opts: {
    shop?: { accessToken: string; shopId: string | number };
    query?: Record<string, string | number | undefined>;
    timestamp?: number;
  } = {}
): string {
  const timestamp = opts.timestamp ?? nowUnix();
  const sign = signRequest(cfg, apiPath, timestamp, opts.shop);
  const params = new URLSearchParams({
    partner_id: String(cfg.partnerId),
    timestamp: String(timestamp),
    sign,
  });
  if (opts.shop) {
    params.set("access_token", opts.shop.accessToken);
    params.set("shop_id", String(opts.shop.shopId));
  }
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) params.set(k, String(v));
  }
  return `${cfg.host}${apiPath}?${params.toString()}`;
}

async function parseOrThrow(res: Response, apiPath: string): Promise<unknown> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Shopee ${apiPath}: phản hồi không phải JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  // Shopee returns { error, message, ... } with error="" on success.
  const err = (json as { error?: string }).error;
  if (err) {
    const msg = (json as { message?: string }).message ?? "";
    throw new Error(`Shopee ${apiPath}: ${err} ${msg}`.trim());
  }
  return json;
}

/** Signed GET. `shop` omitted → public API. */
export async function shopeeGet(
  apiPath: string,
  opts: {
    shop?: { accessToken: string; shopId: string | number };
    query?: Record<string, string | number | undefined>;
    cfg?: ShopeeConfig;
  } = {}
): Promise<unknown> {
  const cfg = opts.cfg ?? getShopeeConfig();
  const url = buildSignedUrl(cfg, apiPath, { shop: opts.shop, query: opts.query });
  const res = await fetch(url, { method: "GET" });
  return parseOrThrow(res, apiPath);
}

/** Signed POST. Common params go in the query string; `body` is the JSON payload. */
export async function shopeePost(
  apiPath: string,
  body: Record<string, unknown>,
  opts: {
    shop?: { accessToken: string; shopId: string | number };
    cfg?: ShopeeConfig;
  } = {}
): Promise<unknown> {
  const cfg = opts.cfg ?? getShopeeConfig();
  const url = buildSignedUrl(cfg, apiPath, { shop: opts.shop });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseOrThrow(res, apiPath);
}

/**
 * Central registry of API paths.
 * ✅ verified/stable: the `auth`/`shop` OAuth paths (documented, standard).
 * ⚠️ UNVERIFIED: everything under `livestream`/`product` — confirm in the
 *    official docs once portal access exists before shipping.
 */
export const SHOPEE_PATHS = {
  auth: {
    authPartner: "/api/v2/shop/auth_partner",
    getToken: "/api/v2/auth/token/get",
    refreshToken: "/api/v2/auth/access_token/get",
  },
  // ⚠️ UNVERIFIED below — from community SDK mirroring v2, not official docs.
  livestream: {
    createSession: "/api/v2/livestream/create_session",
    startSession: "/api/v2/livestream/start_session",
    endSession: "/api/v2/livestream/end_session",
    getSessionDetail: "/api/v2/livestream/get_session_detail",
    getSessionMetric: "/api/v2/livestream/get_session_metric",
    getSessionItemMetric: "/api/v2/livestream/get_session_item_metric",
    addItemList: "/api/v2/livestream/add_item_list",
    updateShowItem: "/api/v2/livestream/update_show_item",
    deleteShowItem: "/api/v2/livestream/delete_show_item",
    getItemList: "/api/v2/livestream/get_item_list",
    getLatestCommentList: "/api/v2/livestream/get_latest_comment_list",
    postComment: "/api/v2/livestream/post_comment",
  },
  product: {
    getItemList: "/api/v2/product/get_item_list",
    getItemBaseInfo: "/api/v2/product/get_item_base_info",
  },
} as const;
