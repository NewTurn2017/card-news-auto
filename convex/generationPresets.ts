import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_PRESETS = 20;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("generationPresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { presetId: v.id("generationPresets") },
  handler: async (ctx, { presetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== userId) return null;
    return preset;
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    tone: v.string(),
    writingStyle: v.string(),
    contentLength: v.string(),
    targetAudience: v.optional(v.string()),
    additionalInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("generationPresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Check for duplicate name and overwrite
    const duplicate = existing.find((p) => p.name === args.name);
    if (duplicate) {
      await ctx.db.patch(duplicate._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return duplicate._id;
    }

    // Check max presets limit
    if (existing.length >= MAX_PRESETS) {
      throw new Error(`프리셋은 최대 ${MAX_PRESETS}개까지 저장할 수 있습니다.`);
    }

    return ctx.db.insert("generationPresets", {
      userId,
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    presetId: v.id("generationPresets"),
    name: v.string(),
    tone: v.string(),
    writingStyle: v.string(),
    contentLength: v.string(),
    targetAudience: v.optional(v.string()),
    additionalInstructions: v.optional(v.string()),
  },
  handler: async (ctx, { presetId, ...args }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(presetId, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { presetId: v.id("generationPresets") },
  handler: async (ctx, { presetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(presetId);
  },
});

export const setDefault = mutation({
  args: { presetId: v.id("generationPresets") },
  handler: async (ctx, { presetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== userId) throw new Error("Not found");

    // Clear existing default
    const all = await ctx.db
      .query("generationPresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const p of all) {
      if (p.isDefault) {
        await ctx.db.patch(p._id, { isDefault: false });
      }
    }

    await ctx.db.patch(presetId, { isDefault: true });
  },
});

export const getInternal = internalQuery({
  args: { presetId: v.id("generationPresets") },
  handler: async (ctx, { presetId }) => {
    return ctx.db.get(presetId);
  },
});
