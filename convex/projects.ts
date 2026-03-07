import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

async function buildDuplicateProjectTitle(
  ctx: MutationCtx,
  userId: Id<"users">,
  sourceTitle: string,
): Promise<string> {
  const existingProjects = await ctx.db
    .query("projects")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const existingTitles = new Set(existingProjects.map((project) => project.title));
  const baseTitle = sourceTitle.replace(/ 복사본(?: \d+)?$/, "");
  const duplicateBaseTitle = `${baseTitle} 복사본`;

  if (!existingTitles.has(duplicateBaseTitle)) {
    return duplicateBaseTitle;
  }

  let copyIndex = 2;
  while (existingTitles.has(`${duplicateBaseTitle} ${copyIndex}`)) {
    copyIndex += 1;
  }

  return `${duplicateBaseTitle} ${copyIndex}`;
}

// ─── Queries ────────────────────────────────────────────────

export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("projects")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) return null;
    return project;
  },
});

// Internal query for actions (no auth check)
export const getProjectInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db.get(projectId);
  },
});

// ─── Mutations ──────────────────────────────────────────────

export const createProject = mutation({
  args: {
    title: v.string(),
    sourceType: v.union(
      v.literal("url"),
      v.literal("sns"),
      v.literal("search"),
      v.literal("text"),
      v.literal("youtube"),
    ),
    sourceInput: v.string(),
  },
  handler: async (ctx, { title, sourceType, sourceInput }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return ctx.db.insert("projects", {
      userId,
      title,
      status: "draft",
      sourceType,
      sourceInput,
      generationProgress: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    sourceContent: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("collecting"),
        v.literal("generating"),
        v.literal("completed"),
      ),
    ),
    slideCount: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.sourceContent !== undefined) patch.sourceContent = updates.sourceContent;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.slideCount !== undefined) patch.slideCount = updates.slideCount;

    await ctx.db.patch(projectId, patch);
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    // Delete related slides
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .collect();
    for (const slide of slides) {
      await ctx.db.delete(slide._id);
    }

    // Delete related sources
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .collect();
    for (const source of sources) {
      await ctx.db.delete(source._id);
    }

    await ctx.db.delete(projectId);
  },
});

export const duplicateProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_projectId_order", (q) => q.eq("projectId", projectId))
      .collect();

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .collect();

    const now = Date.now();
    const duplicatedProjectId = await ctx.db.insert("projects", {
      userId,
      title: await buildDuplicateProjectTitle(ctx, userId, project.title),
      status: project.status === "completed" ? "completed" : "draft",
      sourceType: project.sourceType,
      sourceInput: project.sourceInput,
      sourceContent: project.sourceContent,
      generationProgress: project.status === "completed" ? project.generationProgress : 0,
      slideCount: slides.length,
      createdAt: now,
      updatedAt: now,
    });

    for (const slide of slides) {
      const { _id, _creationTime, ...slideData } = slide;
      void _id;
      void _creationTime;
      await ctx.db.insert("slides", {
        ...slideData,
        projectId: duplicatedProjectId,
      });
    }

    for (const source of sources) {
      const { _id, _creationTime, ...sourceData } = source;
      void _id;
      void _creationTime;
      await ctx.db.insert("sources", {
        ...sourceData,
        projectId: duplicatedProjectId,
      });
    }

    return duplicatedProjectId;
  },
});

// Internal mutation for actions (no auth check)
export const updateProjectProgress = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("draft"),
      v.literal("collecting"),
      v.literal("generating"),
      v.literal("completed"),
    ),
    progress: v.number(),
  },
  handler: async (ctx, { projectId, status, progress }) => {
    await ctx.db.patch(projectId, {
      status,
      generationProgress: progress,
      updatedAt: Date.now(),
    });
  },
});

// Internal mutation for actions to update project fields
export const updateProjectInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    sourceContent: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("collecting"),
        v.literal("generating"),
        v.literal("completed"),
      ),
    ),
    progress: v.optional(v.number()),
    slideCount: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, progress, ...updates }) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.sourceContent !== undefined) patch.sourceContent = updates.sourceContent;
    if (updates.status !== undefined) patch.status = updates.status;
    if (progress !== undefined) patch.generationProgress = progress;
    if (updates.slideCount !== undefined) patch.slideCount = updates.slideCount;

    await ctx.db.patch(projectId, patch);
  },
});

// Internal mutation to update project title (used by collect actions)
export const updateProjectTitle = internalMutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
  },
  handler: async (ctx, { projectId, title }) => {
    await ctx.db.patch(projectId, {
      title,
      updatedAt: Date.now(),
    });
  },
});
