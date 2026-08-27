import { MetadataRoute } from "next";
import { getCorpusManifest } from "@/lib/corpus";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://warren-banking.vercel.app";
  const manifest = getCorpusManifest();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/atoms`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/compile`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/roles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/deltas`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/currentness`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Atom routes
  const atomRoutes: MetadataRoute.Sitemap = Object.keys(manifest.atoms).flatMap((id) => [
    {
      url: `${baseUrl}/atom/${id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare/${id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/path/${id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ]);

  // Role routes
  const roleRoutes: MetadataRoute.Sitemap = manifest.roles.map((r) => ({
    url: `${baseUrl}/role/${r.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...atomRoutes, ...roleRoutes];
}
