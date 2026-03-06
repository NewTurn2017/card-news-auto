import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  // Convex Auth 기본 테이블 (users, sessions, accounts, etc.)
  ...authTables,

  // 사용자 프로필 확장
  userProfiles: defineTable({
    userId: v.id("users"),
    geminiApiKey: v.optional(v.string()), // AES-256 암호화 저장
    settings: v.object({
      defaultFont: v.string(), // 기본 글씨체
      defaultBgType: v.string(), // "solid" | "gradient"
      defaultBgColor: v.string(), // 기본 배경색
    }),
  }).index("by_userId", ["userId"]),

  // 프로젝트
  projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("collecting"),
      v.literal("generating"),
      v.literal("completed"),
    ),
    sourceType: v.union(
      v.literal("url"),
      v.literal("sns"),
      v.literal("search"),
      v.literal("text"),
      v.literal("youtube"),
    ),
    sourceInput: v.string(),
    sourceContent: v.optional(v.string()), // AI 정리된 콘텐츠
    generationProgress: v.number(), // 0~100
    slideCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  // 슬라이드
  slides: defineTable({
    projectId: v.id("projects"),
    order: v.number(),
    type: v.union(
      v.literal("cover"),
      v.literal("content"),
      v.literal("ending"),
    ),
    layoutId: v.string(),
    content: v.object({
      category: v.optional(v.string()),
      title: v.string(),
      subtitle: v.optional(v.string()),
      body: v.optional(v.string()),
      source: v.optional(v.string()),
    }),
    style: v.object({
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
    }),
    image: v.optional(
      v.object({
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
      }),
    ),
    htmlContent: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_order", ["projectId", "order"]),

  // 사용자 스타일 프리셋
  stylePresets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    style: v.object({
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
    }),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // 수집된 소스 자료
  sources: defineTable({
    projectId: v.id("projects"),
    type: v.union(v.literal("url"), v.literal("sns"), v.literal("search"), v.literal("youtube")),
    url: v.optional(v.string()),
    query: v.optional(v.string()),
    // SNS 스크랩 전용 필드
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
    collectedAt: v.number(),
  }).index("by_projectId", ["projectId"]),
});
