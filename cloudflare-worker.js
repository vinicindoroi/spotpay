/**
 * ============================================================================
 * 🛡️ CLOAKILIOSHIELD - SISTEMA DE CLOAKING AVANÇADO (ESTILO CLOAKILIO)
 * ============================================================================
 * 
 * Arquitetura baseada no modelo de camadas do Cloakilio:
 *  1. Camada de Rede (Edge Cloudflare): Geo-fencing (País), Detecção ASN de Datacenter/ISP.
 *  2. Camada de Parâmetros de Tráfego: Validação de Tokens de Plataforma (Meta fbclid, utm_*).
 *  3. Camada de Fingerprint Client-Side: Canvas / WebGL (SwiftShader, llvmpipe), Headless e Desafio Anti-Bot.
 *  4. Camada de Threat Intelligence: Verificação de Proxies Residenciais & VPNs (ProxyCheck).
 *  5. Entrega Server-Side Transparente (Reverse Proxy puro com HTTP 200).
 */

// ============================================================================
// ⚙️ PAINEL DE CONFIGURAÇÃO MANUAL
// ============================================================================
const CONFIG = {
  // Modo: "AUTOMATICO" (Cloaker ativo) | "SO_WHITEPAGE" (Força White) | "SO_OFERTA" (Força Oferta)
  MODO: "AUTOMATICO",

  // Destinos das Páginas
  WHITEPAGE_URL: "https://seusite.com/white",
  OFERTA_URL: "https://seusite.com/oferta",

  // 1. Filtro Geográfico (ISO 2 letras dos países permitidos para a oferta)
  // Deixe vazio [] para aceitar todos, ou ["BR"] para focar apenas no Brasil
  PAISES_PERMITIDOS: ["BR"],

  // 2. Filtro de Parâmetro da Campanha (Deixe vazio "" se não quiser exigir palavra-chave)
  PARAMETRO_UTM: "",
  EXIGIR_FBCLID: false, // se true, só libera humanos com fbclid presente

  // 3. Filtro de Dispositivos Permitidos
  // true = aceita | false = barra e manda pra whitepage
  PERMITIR_MOBILE: true,   // Celulares (iPhone, Android)
  PERMITIR_DESKTOP: true,  // PCs/Macs normais

  // 4. Nível de Rigor contra VPN / Proxy Residencial (ProxyCheck.io)
  RISCO_MAXIMO: 60,
  API_KEY: "96b67s-522c54-730017-h38p9e",
};

// ============================================================================
// 🛡️ LISTAS DE SEGURANÇA E MOTOR DE FILTRAGEM
// ============================================================================

// ASNs de Datacenters, Moderação e Ferramentas de Espionagem (Meta, AWS, Google, Spy Tools)
const BLOCKED_ASNS = new Set([
  32934,  // Meta Platforms / Facebook
  63293,  // Meta Platforms
  16509,  // Amazon AWS
  14618,  // Amazon AWS
  15169,  // Google Cloud
  8075,   // Microsoft Azure
  14061,  // DigitalOcean
  16276,  // OVH
  24940,  // Hetzner
  51167,  // Contabo
  13335,  // Cloudflare Warp / Scrapers
  20473,  // Vultr / Choopa
  60068,  // CDN77 / Spy services
  46652,  // AdPlexity / Spy scrapers
]);

// Padrões de Crawlers, Moderadores e Headless
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
  "bytedance",
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
  "semrush",
  "ahrefs",
  "adplexity",
  "spyfu",
];

// Cache em memória do Worker para consultas de IP (12 horas)
const ipCache = new Map();

async function checkThreatScore(clientIp, apiKey, maxRisk) {
  if (!apiKey || !clientIp) return false;

  const cached = ipCache.get(clientIp);
  if (cached && Date.now() - cached.time < 12 * 60 * 60 * 1000) {
    return cached.isBad;
  }

  try {
    const queryUrl = `https://proxycheck.io/v2/${clientIp}?key=${apiKey}&vpn=1&asn=1&risk=1`;
    const res = await fetch(queryUrl, { cf: { cacheTtl: 43200 } });
    if (!res.ok) return false;

    const data = await res.json();
    const result = data[clientIp];
    if (!result) return false;

    const isBad = result.proxy === "yes" || (result.risk && Number(result.risk) >= maxRisk);
    ipCache.set(clientIp, { isBad, time: Date.now() });
    return isBad;
  } catch (e) {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    const clientIp = request.headers.get("cf-connecting-ip") || "";
    const cf = request.cf || {};
    const asn = cf.asn;
    const country = (cf.country || "").toUpperCase();

    // 1. Arquivos estáticos passam sem consumo de regras
    if (/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ico|mp3|mp4|json)$/i.test(url.pathname)) {
      return fetch(request);
    }

    // 2. Processa apenas rotas de páginas
    const isMainRoute = url.pathname === "/" || url.pathname === "/index.html";
    if (!isMainRoute) {
      return fetch(request);
    }

    // 3. Modos Forçados
    if (CONFIG.MODO === "SO_WHITEPAGE") {
      return serveTarget(request, CONFIG.WHITEPAGE_URL, true);
    }
    if (CONFIG.MODO === "SO_OFERTA") {
      return serveTarget(request, CONFIG.OFERTA_URL, false);
    }

    // ========================================================================
    // MOTOR DE DECISÃO MULTI-CAMADA (CLOAKILIO ENGINE)
    // ========================================================================

    // CAMADA 1: Geo-Fencing (Filtro de País)
    let failsGeo = false;
    if (CONFIG.PAISES_PERMITIDOS.length > 0 && country) {
      if (!CONFIG.PAISES_PERMITIDOS.includes(country)) {
        failsGeo = true; // Moderador fora do Brasil (ex: US, IE, SG) é barrado na hora
      }
    }

    // CAMADA 2: Dispositivo e Sistema Operacional
    const isMobile = userAgent.includes("iphone") || userAgent.includes("android");
    let failsDevice = false;
    if (isMobile && !CONFIG.PERMITIR_MOBILE) failsDevice = true;
    if (!isMobile && !CONFIG.PERMITIR_DESKTOP) failsDevice = true;

    // CAMADA 3: Assinatura de Rede (ASN de Datacenter & Bots Conhecidos)
    const isBotUA = !userAgent || BOT_PATTERNS.some((p) => userAgent.includes(p));
    const isDatacenter = asn && BLOCKED_ASNS.has(asn);

    // CAMADA 4: Tokens Obrigatórios da Plataforma (Meta Ads)
    const campaign = (
      url.searchParams.get("utm_campaign") ||
      url.searchParams.get("campaign") ||
      url.searchParams.get("utm_campaign_name") ||
      ""
    ).toLowerCase();

    const hasValidUtm = !CONFIG.PARAMETRO_UTM || campaign.includes(CONFIG.PARAMETRO_UTM.toLowerCase());
    const hasFbclid = Boolean(url.searchParams.get("fbclid"));
    const failsPlatformToken = !hasValidUtm || (CONFIG.EXIGIR_FBCLID && !hasFbclid);

    // CAMADA 5: Consistência de Headers de Navegadores Modernos
    const hasSecChUa = Boolean(request.headers.get("sec-ch-ua"));
    const isSuspiciousBrowser = !hasSecChUa && !isMobile;

    // Veredito preliminar rápido (sem gastar API)
    let isModerator =
      failsGeo ||
      failsDevice ||
      isBotUA ||
      isDatacenter ||
      failsPlatformToken ||
      isSuspiciousBrowser;

    // CAMADA 6: Threat Intelligence em Tempo Real (Proxies Residenciais de Moderadores)
    if (!isModerator && CONFIG.API_KEY) {
      const isProxyOrVpn = await checkThreatScore(clientIp, CONFIG.API_KEY, CONFIG.RISCO_MAXIMO);
      if (isProxyOrVpn) {
        isModerator = true;
      }
    }

    // ========================================================================
    // ENTREGA REVERSE PROXY PURO (HTTP 200 SEM REDIRECT)
    // ========================================================================
    const targetUrl = isModerator ? CONFIG.WHITEPAGE_URL : CONFIG.OFERTA_URL;
    return serveTarget(request, targetUrl, isModerator);
  },
};

/**
 * Função de Entrega Transparente via Edge
 */
async function serveTarget(request, destination, isModerator) {
  const currentUrl = new URL(request.url);
  let finalTarget;

  if (destination.startsWith("http://") || destination.startsWith("https://")) {
    finalTarget = new URL(destination);
  } else {
    finalTarget = new URL(destination, request.url);
  }

  // Preserva integralmente todas as UTMs e parâmetros de rastreamento do anúncio
  finalTarget.search = currentUrl.search;

  const upstreamResponse = await fetch(finalTarget.toString(), {
    headers: request.headers,
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  
  if (isModerator) {
    responseHeaders.set("X-Robots-Tag", "noindex, nofollow");
  }

  return new Response(upstreamResponse.body, {
    status: 200,
    headers: responseHeaders,
  });
}
