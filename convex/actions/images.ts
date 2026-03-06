"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

interface ImageResult {
  id: string;
  url: string;
  thumbUrl: string;
  source: "unsplash" | "pexels";
  attribution: string;
  width: number;
  height: number;
}

export const searchImages = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (_ctx, { query, page = 1, perPage = 20 }) => {
    const results: ImageResult[] = [];

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    const pexelsKey = process.env.PEXELS_API_KEY;
    const bothAvailable = unsplashKey && pexelsKey;

    // Unsplash API
    if (unsplashKey) {
      try {
        const count = bothAvailable ? Math.ceil(perPage / 2) : perPage;
        const unsplashRes = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${count}`,
          {
            headers: {
              Authorization: `Client-ID ${unsplashKey}`,
            },
          },
        );
        if (unsplashRes.ok) {
          const unsplash = await unsplashRes.json();
          for (const photo of unsplash.results ?? []) {
            results.push({
              id: `unsplash-${photo.id}`,
              url: photo.urls.regular,
              thumbUrl: photo.urls.small,
              source: "unsplash",
              attribution: `Photo by ${photo.user.name} on Unsplash`,
              width: photo.width,
              height: photo.height,
            });
          }
        }
      } catch {
        // Unsplash failed, continue with Pexels
      }
    }

    // Pexels API
    if (pexelsKey) {
      try {
        const pexelsCount = bothAvailable ? Math.floor(perPage / 2) : perPage;
        const pexelsRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${pexelsCount}`,
          {
            headers: {
              Authorization: pexelsKey,
            },
          },
        );
        if (pexelsRes.ok) {
          const pexels = await pexelsRes.json();
          for (const photo of pexels.photos ?? []) {
            results.push({
              id: `pexels-${photo.id}`,
              url: photo.src.large,
              thumbUrl: photo.src.medium,
              source: "pexels",
              attribution: `Photo by ${photo.photographer} on Pexels`,
              width: photo.width,
              height: photo.height,
            });
          }
        }
      } catch {
        // Pexels failed
      }
    }

    return results;
  },
});
