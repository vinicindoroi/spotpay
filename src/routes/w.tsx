import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/w")({
  beforeLoad: () => {
    throw redirect({ href: "/w/index.html" });
  },
  head: () => ({
    meta: [
      { title: "Streaming Income Foundations — A Practical Course for Independent Artists" },
      {
        name: "description",
        content:
          "Learn how music distribution, royalties, release planning and audience growth work in a practical online course for independent artists.",
      },
      { property: "og:title", content: "Streaming Income Foundations" },
      {
        property: "og:description",
        content:
          "A practical online course about music distribution, royalties and sustainable audience growth.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
