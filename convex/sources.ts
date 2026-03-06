import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ────────────────────────────────────────────────

export const getSources = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) return [];

    return ctx.db
      .query("sources")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .collect();
  },
});

// ─── Internal Mutations (for actions) ───────────────────────

export const createSource = internalMutation({
  args: {
    projectId: v.id("projects"),
    type: v.union(v.literal("url"), v.literal("sns"), v.literal("search"), v.literal("youtube")),
    url: v.optional(v.string()),
    query: v.optional(v.string()),
    platform: v.optional(
      v.union(
        v.literal("threads"),
        v.literal("instagram"),
        v.literal("facebook"),
        v.literal("x"),
      ),
    ),
    username: v.optional(v.string()),
    rawContent: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("sources", {
      ...args,
      collectedAt: Date.now(),
    });
  },
});
