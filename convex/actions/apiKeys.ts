"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { encrypt } from "../lib/crypto";

export const saveApiKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const encryptedKey = encrypt(apiKey);
    await ctx.runMutation(internal.userProfiles.saveApiKeyInternal, { encryptedKey });
  },
});
