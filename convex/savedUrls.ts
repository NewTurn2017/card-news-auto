import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ────────────────────────────────────────────────

export const listByFolder = query({
  args: {
    folderId: v.optional(
      v.union(v.id("savedUrlFolders"), v.literal("uncategorized"))
    ),
  },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (folderId === undefined) {
      // All URLs
      return ctx.db
        .query("savedUrls")
        .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    if (folderId === "uncategorized") {
      const all = await ctx.db
        .query("savedUrls")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
      return all
        .filter((u) => !u.folderId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    // Specific folder
    const results = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId_folderId", (q) =>
        q.eq("userId", userId).eq("folderId", folderId)
      )
      .collect();
    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query: searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!searchQuery.trim()) return [];

    return ctx.db
      .query("savedUrls")
      .withSearchIndex("search_savedUrls", (q) =>
        q.search("title", searchQuery).eq("userId", userId)
      )
      .take(50);
  },
});

export const getTotalCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const urls = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return urls.length;
  },
});

// ─── Mutations ──────────────────────────────────────────────

export const create = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    sourceType: v.optional(
      v.union(v.literal("url"), v.literal("youtube"), v.literal("sns")),
    ),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return ctx.db.insert("savedUrls", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Internal mutation for actions (no auth check — action handles auth)
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    sourceType: v.optional(
      v.union(v.literal("url"), v.literal("youtube"), v.literal("sns")),
    ),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("savedUrls", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("savedUrls") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const savedUrl = await ctx.db.get(id);
    if (!savedUrl || savedUrl.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(id);
  },
});

export const updateTitle = mutation({
  args: {
    id: v.id("savedUrls"),
    title: v.string(),
  },
  handler: async (ctx, { id, title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const savedUrl = await ctx.db.get(id);
    if (!savedUrl || savedUrl.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(id, { title });
  },
});

export const moveToFolder = mutation({
  args: {
    id: v.id("savedUrls"),
    folderId: v.optional(v.id("savedUrlFolders")),
  },
  handler: async (ctx, { id, folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const savedUrl = await ctx.db.get(id);
    if (!savedUrl || savedUrl.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(id, { folderId });
  },
});
