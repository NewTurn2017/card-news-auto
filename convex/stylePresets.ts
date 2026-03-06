import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const styleValidator = v.object({
  bgType: v.union(v.literal("solid"), v.literal("gradient")),
  bgColor: v.string(),
  gradientFrom: v.optional(v.string()),
  gradientTo: v.optional(v.string()),
  gradientDirection: v.optional(v.string()),
  textColor: v.string(),
  accentColor: v.string(),
  fontFamily: v.string(),
  categorySize: v.optional(v.number()),
  titleSize: v.optional(v.number()),
  subtitleSize: v.optional(v.number()),
  bodySize: v.optional(v.number()),
  categoryColor: v.optional(v.string()),
  titleColor: v.optional(v.string()),
  subtitleColor: v.optional(v.string()),
  bodyColor: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("stylePresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    style: styleValidator,
  },
  handler: async (ctx, { name, style }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate name and overwrite
    const existing = await ctx.db
      .query("stylePresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = existing.find((p) => p.name === name);
    if (duplicate) {
      await ctx.db.patch(duplicate._id, { style });
      return duplicate._id;
    }

    return ctx.db.insert("stylePresets", {
      userId,
      name,
      style,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { presetId: v.id("stylePresets") },
  handler: async (ctx, { presetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(presetId);
  },
});
