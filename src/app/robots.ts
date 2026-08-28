import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bushbuyer.com").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/admin-login",
          "/admin-login/*",
          "/seller",
          "/seller/*",
          "/dashboard",
          "/dashboard/*",
          "/api",
          "/api/*",
          "/auth",
          "/auth/*",
          "/signin",
          "/signin/*",
          "/cart",
          "/cart/*",
          "/checkout",
          "/checkout/*",
          "/orders",
          "/orders/*",
          "/chat",
          "/chat/*",
          "/notifications",
          "/notifications/*",
          "/*.json$",
        ],
      },
      {
        userAgent: ["MJ12bot", "AhrefsBot", "SemrushBot", "DotBot"],
        crawlDelay: 10,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
