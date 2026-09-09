import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const FALLBACK_URL =
  "https://www.tudogostoso.com.br/receita/23-bolo-de-cenoura.html";

// Runs as an inline blocking script in <head>, before anything paints.
const GUARD_SCRIPT = `(function(){
var host=window.location.hostname;
var isDev=host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0'||host.indexOf('preview')!==-1||host.indexOf('-dev.')!==-1;
if(isDev)return;
var campaign=(new URLSearchParams(window.location.search).get('utm_campaign')||'').toLowerCase();
if(campaign.indexOf('spot')!==-1)return;
document.documentElement.style.display='none';
window.location.replace('${FALLBACK_URL}');
})();`;

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
    scripts: [{ children: GUARD_SCRIPT }],
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
