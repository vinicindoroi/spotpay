/**
 * Cloudflare Worker - Cloaker Próprio (Estilo CloakUp)
 * 
 * Arquitetura de Reverse Proxy Transparente:
 * - 0% Iframes no DOM
 * - 0% Redirecionamentos 301/302 (Resposta HTTP 200 pura)
 * - Triagem no Edge em 3 camadas:
 *   1. Filtro local gratuito (ASNs de Datacenters + Bots conhecidos)
 *   2. Cache local KV/Memory de IPs (economiza consultas de API)
 *   3. Consulta à API de Threat Intelligence (ProxyCheck.io) para pegar proxies residenciais
 * - Proxy reverso que entrega a Whitepage para moderadores e a Oferta para humanos
 */

// Chave da API do ProxyCheck.io (obtenha gratuitamente em https://proxycheck.io/)
// Se estiver vazia, o worker usa apenas a triagem local do Cloudflare
const PROXYCHECK_API_KEY = "96b67s-522c54-730017-h38p9e"; 

// Configuração dos caminhos das páginas
const WHITEPAGE_PATH = "/w/index.html";
const OFFER_PATH = "/sp/type/index.html";

// ASNs conhecidos de datacenters, crawlers e infraestrutura de moderação
const BLOCKED_ASNS = new Set([
  32934,  // Meta Platforms / Facebook
  63293,  // Meta Platforms
  16509,  // Amazon AWS
  14618,  // Amazon AWS
  15169,  // Google LLC
  8075,   // Microsoft
  14061,  // DigitalOcean
  16276,  // OVH
  24940,  // Hetzner
  51167,  // Contabo
  13335,  // Cloudflare Warp / Scrapers
  20473,  // AS-CHOOPA (Vultr)
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

// Cache em memória do Worker para evitar consultas repetidas de um mesmo IP
const ipCache = new Map();

async function checkIpThreat(clientIp, apiKey) {
  if (!apiKey || !clientIp) return false;

  // Verifica cache em memória (válido por 12 horas)
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

    // Se for proxy/VPN ou tiver score de risco alto (> 60), classifica como suspeito
    const isBad = result.proxy === "yes" || (result.risk && Number(result.risk) > 60);

    // Salva no cache
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
    
    // Obter dados fornecidos diretamente pela rede da Cloudflare
    const cf = request.cf || {};
    const asn = cf.asn;

    // Se a requisição for para um arquivo estático (css, js, imagens, mp3), deixa passar direto
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ico|mp3|mp4|json)$/i.test(url.pathname);
    if (isStaticAsset) {
      return fetch(request);
    }

    // Só processa as rotas raiz ou de destino
    const isMainRoute = url.pathname === "/" || url.pathname === "/index.html";
    if (!isMainRoute) {
      return fetch(request);
    }

    const campaign = (
      url.searchParams.get("utm_campaign") ||
      url.searchParams.get("campaign") ||
      url.searchParams.get("utm_campaign_name") ||
      ""
    ).toLowerCase();

    // 1. Verificação de robô por User-Agent
    const isBotUA = !userAgent || BOT_PATTERNS.some((p) => userAgent.includes(p));

    // 2. Verificação de Datacenter por ASN da Cloudflare
    const isDatacenter = asn && BLOCKED_ASNS.has(asn);

    // 3. Critério de Parâmetro de Campanha
    const hasValidCampaign = campaign.includes("spot");

    // 4. Verificação de Cabeçalhos Típicos de Navegador Humano
    const hasSecChUa = Boolean(request.headers.get("sec-ch-ua"));
    const isMobile = userAgent.includes("iphone") || userAgent.includes("android");
    const isSuspiciousBrowser = !hasSecChUa && !isMobile;

    let isModerator = isBotUA || isDatacenter || !hasValidCampaign || isSuspiciousBrowser;

    // 5. Tira-teima com API de Threat Intelligence (se configurada e ainda parecer humano)
    if (!isModerator && PROXYCHECK_API_KEY) {
      const isProxyOrVpn = await checkIpThreat(clientIp, PROXYCHECK_API_KEY);
      if (isProxyOrVpn) {
        isModerator = true;
      }
    }

    // ==========================================
    // REVERSE PROXY PURO (Entrega Server-Side)
    // ==========================================

    // Decide qual destino buscar internamente
    const targetPath = isModerator ? WHITEPAGE_PATH : OFFER_PATH;
    const targetUrl = new URL(targetPath, request.url);

    // Repassa os parâmetros da URL para a página de destino
    targetUrl.search = url.search;

    // Busca o HTML na origem
    const upstreamResponse = await fetch(targetUrl.toString(), {
      headers: request.headers,
    });

    // Constrói resposta transparente com HTTP 200
    const newHeaders = new Headers(upstreamResponse.headers);
    newHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    if (isModerator) {
      newHeaders.set("X-Robots-Tag", "noindex, nofollow");
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: newHeaders,
    });
  },
};
