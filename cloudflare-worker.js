/**
 * Cloudflare Worker / Edge Middleware - Cloaker Blindado
 * 
 * Funcionalidades:
 * 1. Bloqueia ASN de Datacenters (Meta, AWS, GCP, Azure, DigitalOcean, etc.)
 * 2. Bloqueia crawlers conhecidos e headless user-agents
 * 3. Valida parâmetros obrigatórios (utm_campaign / fbclid)
 * 4. Serve a Whitepage DIRETAMENTE com status 200 (sem redirects 301/302, evitando flags no Meta)
 * 5. Faz proxy reverso transparente para a página real quando for um visitante humano legítimo
 */

// ASNs conhecidos de datacenters, crawlers e verificadores do Meta/Google
const BLOCKED_ASNS = new Set([
  32934,  // Meta / Facebook
  63293,  // Meta
  16509,  // Amazon AWS
  14618,  // Amazon AWS
  15169,  // Google LLC
  8075,   // Microsoft
  14061,  // DigitalOcean
  16276,  // OVH
  24940,  // Hetzner
  51167,  // Contabo
  13335,  // Cloudflare internal/warp fetchers
]);

const BOT_PATTERNS = [
  "facebookbot",
  "facebookexternalhit",
  "fbexternalagent",
  "fbexternalhit",
  "fbadsbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "googlebot",
  "adsbot-google",
  "google-adsbot",
  "mediapartners-google",
  "tiktokbot",
  "tiktokspider",
  "bingbot",
  "adidxbot",
  "headlesschrome",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
  "python-requests",
  "curl/",
  "wget/",
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    
    // Obter dados de ASN e localização fornecidos pelo Cloudflare
    const cf = request.cf || {};
    const asn = cf.asn;
    const country = cf.country;

    const campaign = (
      url.searchParams.get("utm_campaign") ||
      url.searchParams.get("campaign") ||
      url.searchParams.get("utm_campaign_name") ||
      ""
    ).toLowerCase();

    // 1. Verificar se é bot por User-Agent
    const isBotUA = !userAgent || BOT_PATTERNS.some((p) => userAgent.includes(p));

    // 2. Verificar se o IP é de Datacenter/Crawler conhecido
    const isDatacenter = asn && BLOCKED_ASNS.has(asn);

    // 3. Checar headers típicos de navegador moderno (Sec-CH-UA / Accept)
    const hasSecChUa = Boolean(request.headers.get("sec-ch-ua"));
    const acceptHeader = request.headers.get("accept") || "";
    const isHtmlRequest = acceptHeader.includes("text/html");

    // 4. Critério da campanha
    const hasValidCampaign = campaign.includes("spot");

    // Decisão: Qualquer anomalia serve a WHITEPAGE com status 200 (NUNCA 301/302)
    const shouldShowWhitepage =
      isBotUA ||
      isDatacenter ||
      !hasValidCampaign ||
      (isHtmlRequest && !hasSecChUa && !userAgent.includes("iphone") && !userAgent.includes("android"));

    if (shouldShowWhitepage && (url.pathname === "/" || url.pathname.startsWith("/sp/"))) {
      // Busca a whitepage estática na própria origem e retorna como se fosse a rota principal
      const whitepageUrl = new URL("/w/index.html", request.url);
      const whitepageResponse = await fetch(whitepageUrl.toString(), {
        headers: request.headers,
      });

      // Retorna 200 com noindex/nofollow para bots
      const responseHeaders = new Headers(whitepageResponse.headers);
      responseHeaders.set("X-Robots-Tag", "noindex, nofollow");
      responseHeaders.set("Cache-Control", "no-store, max-age=0");

      return new Response(whitepageResponse.body, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Se passou em todas as verificações, deixa a requisição passar normalmente
    return fetch(request);
  },
};
