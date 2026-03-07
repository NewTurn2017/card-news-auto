import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const textFieldEffectsValidator = v.object({
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
});

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
    category: v.optional(textFieldEffectsValidator),
    title: v.optional(textFieldEffectsValidator),
    subtitle: v.optional(textFieldEffectsValidator),
    body: v.optional(textFieldEffectsValidator),
  })),
});

const contentValidator = v.object({
  category: v.optional(v.string()),
  title: v.string(),
  subtitle: v.optional(v.string()),
  body: v.optional(v.string()),
  source: v.optional(v.string()),
});

const imageValidator = v.object({
  storageId: v.optional(v.id("_storage")),
  externalUrl: v.optional(v.string()),
  opacity: v.number(),
  position: v.object({ x: v.number(), y: v.number() }),
  size: v.number(),
  fit: v.union(
    v.literal("cover"),
    v.literal("contain"),
    v.literal("fill"),
  ),
});

// ─── Queries ────────────────────────────────────────────────

export const getSlides = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) return [];

    return ctx.db
      .query("slides")
      .withIndex("by_projectId_order", (q) => q.eq("projectId", projectId))
      .collect();
  },
});

export const getFirstSlide = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) return null;

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_projectId_order", (q) => q.eq("projectId", projectId))
      .take(1);

    return slides[0] ?? null;
  },
});

// ─── Mutations ──────────────────────────────────────────────

export const createSlide = mutation({
  args: {
    projectId: v.id("projects"),
    order: v.number(),
    type: v.union(
      v.literal("cover"),
      v.literal("content"),
      v.literal("ending"),
    ),
    layoutId: v.string(),
    content: contentValidator,
    style: styleValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    return ctx.db.insert("slides", args);
  },
});

export const updateSlide = mutation({
  args: {
    slideId: v.id("slides"),
    content: contentValidator,
  },
  handler: async (ctx, { slideId, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slide = await ctx.db.get(slideId);
    if (!slide) throw new Error("Not found");

    const project = await ctx.db.get(slide.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(slideId, { content });
  },
});

export const updateSlideStyle = mutation({
  args: {
    slideId: v.id("slides"),
    style: styleValidator,
  },
  handler: async (ctx, { slideId, style }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slide = await ctx.db.get(slideId);
    if (!slide) throw new Error("Not found");

    const project = await ctx.db.get(slide.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(slideId, { style });
  },
});

export const updateSlideImage = mutation({
  args: {
    slideId: v.id("slides"),
    image: v.optional(imageValidator),
  },
  handler: async (ctx, { slideId, image }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slide = await ctx.db.get(slideId);
    if (!slide) throw new Error("Not found");

    const project = await ctx.db.get(slide.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(slideId, { image });
  },
});

export const deleteSlide = mutation({
  args: { slideId: v.id("slides") },
  handler: async (ctx, { slideId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slide = await ctx.db.get(slideId);
    if (!slide) throw new Error("Not found");

    const project = await ctx.db.get(slide.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(slideId);

    // Reorder remaining slides
    const remaining = await ctx.db
      .query("slides")
      .withIndex("by_projectId_order", (q) => q.eq("projectId", slide.projectId))
      .collect();

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await ctx.db.patch(remaining[i]._id, { order: i });
      }
    }
  },
});

export const reorderSlides = mutation({
  args: {
    projectId: v.id("projects"),
    slideIds: v.array(v.id("slides")),
  },
  handler: async (ctx, { projectId, slideIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    for (let i = 0; i < slideIds.length; i++) {
      await ctx.db.patch(slideIds[i], { order: i });
    }
  },
});

export const updateSlideLayout = mutation({
  args: {
    slideId: v.id("slides"),
    layoutId: v.string(),
  },
  handler: async (ctx, { slideId, layoutId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slide = await ctx.db.get(slideId);
    if (!slide) throw new Error("Not found");

    const project = await ctx.db.get(slide.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(slideId, { layoutId });
  },
});

export const applyStyleToAll = mutation({
  args: {
    projectId: v.id("projects"),
    style: styleValidator,
  },
  handler: async (ctx, { projectId, style }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_projectId_order", (q) => q.eq("projectId", projectId))
      .collect();

    for (const slide of slides) {
      await ctx.db.patch(slide._id, { style });
    }
  },
});

// ─── Internal (for actions) ─────────────────────────────────

export const getSlideInternal = internalQuery({
  args: { slideId: v.id("slides") },
  handler: async (ctx, { slideId }) => {
    return ctx.db.get(slideId);
  },
});

export const createSlideInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    order: v.number(),
    type: v.union(
      v.literal("cover"),
      v.literal("content"),
      v.literal("ending"),
    ),
    layoutId: v.string(),
    content: contentValidator,
    style: styleValidator,
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("slides", args);
  },
});
