import {
  getShopeeConfig,
  buildSignedUrl,
  shopeePost,
  SHOPEE_PATHS,
  type ShopeeConfig,
} from "./client";

/**
 * Shopee Open Platform OAuth-style shop authorization (documented, stable).
 *
 * Flow:
 *  1. Redirect the seller to `buildAuthorizeUrl(redirect)`.
 *  2. Seller approves → Shopee redirects to our callback with `?code=&shop_id=`.
 *  3. `exchangeCodeForToken(code, shopId)` → access_token (~4h) + refresh_token (~30d).
 *  4. `refreshAccessToken(refreshToken, shopId)` before the access_token expires.
 */

export type ShopeeToken = {
  accessToken: string;
  refreshToken: string;
  /** access_token lifetime in seconds (Shopee returns `expire_in`). */
  expiresInSec: number;
  shopId: string;
};

/** Step 1: the URL to send the seller to in order to authorize our app. */
export function buildAuthorizeUrl(redirectUrl: string, cfg?: ShopeeConfig): string {
  const c = cfg ?? getShopeeConfig();
  return buildSignedUrl(c, SHOPEE_PATHS.auth.authPartner, {
    query: { redirect: redirectUrl },
  });
}

/** Step 3: exchange the one-time `code` for tokens. Public API (no shop token yet). */
export async function exchangeCodeForToken(
  code: string,
  shopId: string | number,
  cfg?: ShopeeConfig
): Promise<ShopeeToken> {
  const c = cfg ?? getShopeeConfig();
  const res = (await shopeePost(
    SHOPEE_PATHS.auth.getToken,
    { code, shop_id: Number(shopId), partner_id: Number(c.partnerId) },
    { cfg: c }
  )) as { access_token: string; refresh_token: string; expire_in: number };
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresInSec: res.expire_in,
    shopId: String(shopId),
  };
}

/** Step 4: refresh an expiring access_token. Public API. */
export async function refreshAccessToken(
  refreshToken: string,
  shopId: string | number,
  cfg?: ShopeeConfig
): Promise<ShopeeToken> {
  const c = cfg ?? getShopeeConfig();
  const res = (await shopeePost(
    SHOPEE_PATHS.auth.refreshToken,
    { refresh_token: refreshToken, shop_id: Number(shopId), partner_id: Number(c.partnerId) },
    { cfg: c }
  )) as { access_token: string; refresh_token: string; expire_in: number };
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresInSec: res.expire_in,
    shopId: String(shopId),
  };
}
