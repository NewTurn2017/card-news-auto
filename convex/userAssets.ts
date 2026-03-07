import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAsset = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.union(
      v.literal("logo"),
      v.literal("watermark"),
      v.literal("stamp"),
      v.literal("image"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.insert("userAssets", {
      ...args,
      userId,
      createdAt: Date.now(),
    });
  },
});

export const listAssets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const assets = await ctx.db
      .query("userAssets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return Promise.all(
      assets.map(async (a) => ({
        ...a,
        url: await ctx.storage.getUrl(a.storageId),
      })),
    );
  },
});

export const deleteAsset = mutation({
  args: { assetId: v.id("userAssets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const asset = await ctx.db.get(assetId);
    if (!asset || asset.userId !== userId) throw new Error("Not found");
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(assetId);
  },
});

export const getAssetUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
