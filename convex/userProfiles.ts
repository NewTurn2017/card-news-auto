import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ────────────────────────────────────────────────

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name as string | undefined,
      email: user.email as string | undefined,
      image: user.image as string | undefined,
    };
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const hasApiKey = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return !!profile?.geminiApiKey;
  },
});

// ─── Mutations ──────────────────────────────────────────────

export const saveApiKeyInternal = internalMutation({
  args: { encryptedKey: v.string() },
  handler: async (ctx, { encryptedKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { geminiApiKey: encryptedKey });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        geminiApiKey: encryptedKey,
        settings: {
          defaultFont: "'Noto Sans KR', sans-serif",
          defaultBgType: "solid",
          defaultBgColor: "#0f0f0f",
        },
      });
    }
  },
});

export const updateSettings = mutation({
  args: {
    settings: v.object({
      defaultFont: v.string(),
      defaultBgType: v.string(),
      defaultBgColor: v.string(),
    }),
  },
  handler: async (ctx, { settings }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { settings });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        settings,
      });
    }
  },
});

export const deleteApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { geminiApiKey: undefined });
    }
  },
});

// ─── Internal ───────────────────────────────────────────────

export const getProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getProfileByAuth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});
