import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ────────────────────────────────────────────────

export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { folders: [], uncategorizedCount: 0 };

    const folders = await ctx.db
      .query("savedUrlFolders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const foldersWithCount = await Promise.all(
      folders.map(async (folder) => {
        const urls = await ctx.db
          .query("savedUrls")
          .withIndex("by_userId_folderId", (q) =>
            q.eq("userId", userId).eq("folderId", folder._id)
          )
          .collect();
        return { ...folder, urlCount: urls.length };
      })
    );

    const allUrls = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const uncategorizedCount = allUrls.filter((u) => !u.folderId).length;

    return {
      folders: foldersWithCount.sort((a, b) => a.order - b.order),
      uncategorizedCount,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────

export const createFolder = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("savedUrlFolders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const maxOrder = existing.reduce((max, f) => Math.max(max, f.order), 0);

    return ctx.db.insert("savedUrlFolders", {
      userId,
      name,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const renameFolder = mutation({
  args: { folderId: v.id("savedUrlFolders"), name: v.string() },
  handler: async (ctx, { folderId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(folderId, { name });
  },
});

export const deleteFolder = mutation({
  args: { folderId: v.id("savedUrlFolders") },
  handler: async (ctx, { folderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(folderId);
    if (!folder || folder.userId !== userId) throw new Error("Not found");

    // Move folder URLs to uncategorized
    const urls = await ctx.db
      .query("savedUrls")
      .withIndex("by_userId_folderId", (q) =>
        q.eq("userId", userId).eq("folderId", folderId)
      )
      .collect();

    for (const url of urls) {
      await ctx.db.patch(url._id, { folderId: undefined });
    }

    await ctx.db.delete(folderId);
  },
});
