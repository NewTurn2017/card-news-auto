import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const textEffectValidator = v.optional(v.object({
  fontWeight: v.optional(v.number()),
  italic: v.optional(v.boolean()),
  underline: v.optional(v.boolean()),
  strikethrough: v.optional(v.boolean()),
  uppercase: v.optional(v.boolean()),
  opacity: v.optional(v.number()),
  shadowColor: v.optional(v.string()),
  shadowBlur: v.optional(v.number()),
  shadowX: v.optional(v.number()),
  shadowY: v.optional(v.number()),
  bgColor: v.optional(v.string()),
  bgPadding: v.optional(v.number()),
  bgRadius: v.optional(v.number()),
  strokeColor: v.optional(v.string()),
  strokeWidth: v.optional(v.number()),
}));

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
  titleLineHeight: v.optional(v.number()),
  titleLetterSpacing: v.optional(v.number()),
  subtitleLineHeight: v.optional(v.number()),
  subtitleLetterSpacing: v.optional(v.number()),
  bodyLineHeight: v.optional(v.number()),
  bodyLetterSpacing: v.optional(v.number()),
  textEffects: v.optional(v.object({
    category: textEffectValidator,
    title: textEffectValidator,
    subtitle: textEffectValidator,
    body: textEffectValidator,
  })),
  textPositions: v.optional(v.object({
    category: v.optional(v.object({ x: v.number(), y: v.number() })),
    title: v.optional(v.object({ x: v.number(), y: v.number() })),
    subtitle: v.optional(v.object({ x: v.number(), y: v.number() })),
    body: v.optional(v.object({ x: v.number(), y: v.number() })),
  })),
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

const overlayValidator = v.object({
  assetId: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  opacity: v.number(),
});

const imageValidator = v.optional(v.object({
  storageId: v.optional(v.id("_storage")),
  externalUrl: v.optional(v.string()),
  opacity: v.number(),
  position: v.object({ x: v.number(), y: v.number() }),
  size: v.number(),
  fit: v.union(
    v.literal("cover"),
    v.literal("contain"),
    v.literal("fill"),
    v.literal("free"),
  ),
}));

export const save = mutation({
  args: {
    name: v.string(),
    style: styleValidator,
    layoutId: v.optional(v.string()),
    overlays: v.optional(v.array(overlayValidator)),
    image: imageValidator,
  },
  handler: async (ctx, { name, style, layoutId, overlays, image }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate name and overwrite
    const existing = await ctx.db
      .query("stylePresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = existing.find((p) => p.name === name);
    if (duplicate) {
      await ctx.db.patch(duplicate._id, { style, layoutId, overlays, image });
      return duplicate._id;
    }

    return ctx.db.insert("stylePresets", {
      userId,
      name,
      style,
      layoutId,
      overlays,
      image,
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
