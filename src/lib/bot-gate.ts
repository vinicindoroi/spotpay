// Server-side gate for crawlers/robots that do NOT execute JavaScript.
// Browsers keep the inline <head> gate; this one covers platform robots
// (Meta, Google Ads, TikTok, Bing/Microsoft Ads, X, LinkedIn, Pinterest,
// Snapchat, Reddit, messengers, AI/SEO crawlers and headless tooling).
//
// A robot must satisfy the SAME rules as a human visitor:
//   utm_campaign contains "spot"  AND  a non-empty fbclid is present.
// Anything else is redirected before any HTML is produced.

export const BOT_GATE_TARGET =
  "https://www.tudogostoso.com.br/receita/29124-bolo-simples.html";

const BOT_USER_AGENTS = [
  // Meta (Facebook / Instagram / WhatsApp)
  "facebookbot",
  "fbexternalagent",
  "fbexternalhit",
  "facebookexternalhit",
  "fbadsbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "meta-externalfb",
  "whatsapp",
  "instagram",
  // Google (Ads, Search, generic Google fetchers)
  "googleadsbot",
  "adsbot-google",
  "google-adsbot",
  "mediapartners-google",
  "googleother",
  "googlebot",
  "apis-google",
  "googlefavicon",
  // TikTok
  "tiktokspider",
  "tiktokbot",
  // Microsoft / Bing / Bing Ads
  "bingbot",
  "adidxbot",
  "bingpreview",
  "microsoftpreview",
  // X, LinkedIn, Pinterest, Reddit, Snapchat
  "twitterbot",
  "twitterurlresolverservice",
  "t.co",
  "linkedinbot",
  "pinterestbot",
  "redditbot",
  "snapchatbot",
  "snapchaturlexpand",
  "botsnapsnapsnapsnap",
  // Messengers / collaboration tools
  "telegrambot",
  "slackbot",
  "discordbot",
  "viber",
  "skype",
  "notionbot",
  "keynotebot",
  // AI, SEO and generic crawlers
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "amazonbot",
  "applebot",
  "duckassistbot",
  "bytespider",
  "petalbot",
  "sogou",
  "yandexbot",
  "baiduspider",
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "dotbot",
  // Headless automation
  "headlesschrome",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
];

const DOCUMENT_PATHS = ["/", "/up1", "/up2"];

function isDevHost(host: string, searchParams: URLSearchParams): boolean {
  if (searchParams.get("dev") === "1") return true;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("id-preview--") ||
    host.endsWith("-dev.lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".sandbox.lovable.dev")
  );
}

export function isKnownBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase().trim();
  if (!ua) return true; // no User-Agent: treat as robot
  return BOT_USER_AGENTS.some((pattern) => ua.includes(pattern));
}

function isDocumentPath(pathname: string): boolean {
  return DOCUMENT_PATHS.includes(pathname) || pathname.startsWith("/sp/");
}

function campaignOf(searchParams: URLSearchParams): string {
  const raw =
    searchParams.get("utm_campaign") ||
    searchParams.get("campaign") ||
    searchParams.get("utm_campaign_name") ||
    "";
  return `${raw}`.toLowerCase();
}

export function shouldRedirectBot(request: Request): boolean {
  const url = new URL(request.url);
  if (!isDocumentPath(url.pathname)) return false;

  const forwardedHost = request.headers.get("x-forwarded-host") ?? "";
  const host = url.hostname === "localhost" && forwardedHost ? forwardedHost : url.hostname;
  if (isDevHost(host, url.searchParams)) return false;

  if (!isKnownBot(request.headers.get("user-agent") ?? "")) return false;

  const hasCampaign = campaignOf(url.searchParams).includes("spot");
  const fbclid = url.searchParams.get("fbclid");
  return !(hasCampaign && !!fbclid);
}

export function botRedirectResponse(): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: BOT_GATE_TARGET,
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
