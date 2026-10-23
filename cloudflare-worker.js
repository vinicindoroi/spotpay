/**
 * ============================================================================
 * ⚙️ PAINEL DE CONTROLE MANUAL DO CLOAKER (CLOUDFLARE WORKER)
 * ============================================================================
 * Ajuste as configurações abaixo livremente conforme sua estratégia de tráfego.
 */
const CONFIG = {
  // 1. Modo de Operação:
  //    "AUTOMATICO"   -> Cloaker ativo: filtra bots e libera humanos para a oferta
  //    "SO_WHITEPAGE" -> Força Whitepage para TODOS (ideal enquanto o anúncio está em análise no Meta)
  //    "SO_OFERTA"    -> Libera a Oferta para TODOS (desliga o filtro)
  MODO: "AUTOMATICO",

  // 2. Destino Seguro (Whitepage):
  //    O que os robôs do Facebook, moderadores e acessos sem campanha vão ver.
  //    Pode ser um caminho interno (ex: "/w/index.html") ou uma URL externa completa (ex: "https://globo.com")
  WHITEPAGE_URL: "/w/index.html",

  // 3. Destino da Oferta:
  //    O que os compradores reais do seu anúncio vão ver.
  //    Pode ser um caminho interno (ex: "/sp/type/index.html") ou uma página externa de checkout/vendas.
  OFERTA_URL: "/sp/type/index.html",

  // 4. Parâmetro obrigatório na URL para liberar o acesso humano:
  //    Se a URL não tiver essa palavra no utm_campaign, cai na Whitepage.
  PARAMETRO_UTM: "spot",

  // 5. Nível de rigor contra Proxies/VPNs (0 a 100):
  //    Quanto menor o número, mais rígido é o filtro.
  //    60 = padrão de mercado (bloqueia proxies residenciais e VPNs comerciais).
  RISCO_MAXIMO: 60,

  // 6. Sua chave pessoal do ProxyCheck.io (vazio "" desativa a consulta de API e usa apenas o filtro local):
  API_KEY: "96b67s-522c54-730017-h38p9e",
};

/**
 * ============================================================================
 * 🛡️ NÚCLEO DO CLOAKER (NÃO PRECISA MEXER DAQUI PARA BAIXO)
 * ============================================================================
 */

// ASNs de datacenters e crawlers do Meta/Google/AWS bloqueados na borda
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
  13335,  // Cloudflare Warp
  20473,  // Vultr / Choopa
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

// Cache em memória do Worker para economizar requisições na API
const ipCache = new Map();

async function checkThreatScore(clientIp, apiKey, maxRisk) {
  if (!apiKey || !clientIp) return false;

  // Cache válido por 12 horas
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

    // Ignora arquivos estáticos (css, js, imagens, fontes, áudios)
    if (/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ico|mp3|mp4|json)$/i.test(url.pathname)) {
      return fetch(request);
    }

    // Processa rotas principais de navegação
    const isMainRoute = url.pathname === "/" || url.pathname === "/index.html";
    if (!isMainRoute) {
      return fetch(request);
    }

    // 1. Checagem de Modo Manual Forçado
    if (CONFIG.MODO === "SO_WHITEPAGE") {
      return serveTarget(request, CONFIG.WHITEPAGE_URL, true);
    }
    if (CONFIG.MODO === "SO_OFERTA") {
      return serveTarget(request, CONFIG.OFERTA_URL, false);
    }

    // 2. Modo Automático (Cloaker Inteligente)
    const campaign = (
      url.searchParams.get("utm_campaign") ||
      url.searchParams.get("campaign") ||
      url.searchParams.get("utm_campaign_name") ||
      ""
    ).toLowerCase();

    const isBotUA = !userAgent || BOT_PATTERNS.some((p) => userAgent.includes(p));
    const isDatacenter = asn && BLOCKED_ASNS.has(asn);
    const hasValidUtm = campaign.includes(CONFIG.PARAMETRO_UTM.toLowerCase());
    const hasSecChUa = Boolean(request.headers.get("sec-ch-ua"));
    const isMobile = userAgent.includes("iphone") || userAgent.includes("android");
    const isSuspiciousBrowser = !hasSecChUa && !isMobile;

    let isModerator = isBotUA || isDatacenter || !hasValidUtm || isSuspiciousBrowser;

    // Tira-teima com a API de IP se ainda parecer humano
    if (!isModerator && CONFIG.API_KEY) {
      const isProxyOrVpn = await checkThreatScore(clientIp, CONFIG.API_KEY, CONFIG.RISCO_MAXIMO);
      if (isProxyOrVpn) {
        isModerator = true;
      }
    }

    // Entrega o destino correspondente via Proxy Reverso
    const targetUrl = isModerator ? CONFIG.WHITEPAGE_URL : CONFIG.OFERTA_URL;
    return serveTarget(request, targetUrl, isModerator);
  },
};

/**
 * Função de entrega transparente (Reverse Proxy)
 * Busca o HTML na origem e entrega com HTTP 200 puro sem redirects
 */
async function serveTarget(request, destination, isModerator) {
  const currentUrl = new URL(request.url);
  let finalTarget;

  if (destination.startsWith("http://") || destination.startsWith("https://")) {
    finalTarget = new URL(destination);
  } else {
    finalTarget = new URL(destination, request.url);
  }

  // Preserva os parâmetros de UTM e rastreamento da URL original
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
