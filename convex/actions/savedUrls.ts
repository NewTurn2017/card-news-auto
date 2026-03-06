"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Firecrawl from "@mendable/firecrawl-js";
import { getAuthUserId } from "@convex-dev/auth/server";

export const extractAndSave = action({
  args: {
    url: v.string(),
    sourceType: v.optional(
      v.union(v.literal("url"), v.literal("youtube"), v.literal("sns")),
    ),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, { url, sourceType, folderId }): Promise<{
    id: string;
    title: string;
    description: string | undefined;
    thumbnailUrl: string | undefined;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY!,
    });

    let title = url;
    let description: string | undefined;
    let thumbnailUrl: string | undefined;

    try {
      const result = await firecrawl.scrape(url, {
        formats: ["markdown"],
      });

      const metadata = (
        result as {
          metadata?: {
            title?: string;
            description?: string;
            ogImage?: string;
            "og:image"?: string;
            "og:title"?: string;
            "og:description"?: string;
          };
        }
      ).metadata;

      if (metadata) {
        title = metadata["og:title"] || metadata.title || url;
        description = metadata["og:description"] || metadata.description;
        thumbnailUrl = metadata["og:image"] || metadata.ogImage;
      }
    } catch {
      // Metadata extraction failed — save with URL as title
    }

    const id = await ctx.runMutation(internal.savedUrls.createInternal, {
      userId,
      url,
      title,
      description,
      thumbnailUrl,
      sourceType,
      folderId,
    });

    return { id, title, description, thumbnailUrl };
  },
});
