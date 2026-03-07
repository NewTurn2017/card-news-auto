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
      titleLineHeight: v.optional(v.number()),
      titleLetterSpacing: v.optional(v.number()),
      subtitleLineHeight: v.optional(v.number()),
      subtitleLetterSpacing: v.optional(v.number()),
      bodyLineHeight: v.optional(v.number()),
      bodyLetterSpacing: v.optional(v.number()),
      textEffects: v.optional(v.object({
        category: v.optional(v.object({
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
        })),
        title: v.optional(v.object({
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
        })),
        subtitle: v.optional(v.object({
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
        })),
        body: v.optional(v.object({
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
        })),
      })),
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
          v.literal("free"),
        ),
      }),
    ),
    originalContent: v.optional(v.object({
      category: v.optional(v.string()),
      title: v.string(),
      subtitle: v.optional(v.string()),
      body: v.optional(v.string()),
      source: v.optional(v.string()),
    })),
    overlays: v.optional(v.array(v.object({
      assetId: v.id("userAssets"),
      x: v.number(),
      y: v.number(),
      width: v.number(),
      opacity: v.number(),
    }))),
    htmlContent: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_order", ["projectId", "order"]),

  // 사용자 에셋 (로고, 워터마크 등)
  userAssets: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.union(
      v.literal("logo"),
      v.literal("watermark"),
      v.literal("stamp"),
      v.literal("image"),
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // 생성 스타일 프리셋 (톤, 말투, 글자수 등)
  generationPresets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    tone: v.string(),
    writingStyle: v.string(),
    contentLength: v.string(),
    targetAudience: v.optional(v.string()),
    additionalInstructions: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // 사용자 스타일 프리셋 (비주얼)
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
      titleLineHeight: v.optional(v.number()),
      titleLetterSpacing: v.optional(v.number()),
      subtitleLineHeight: v.optional(v.number()),
      subtitleLetterSpacing: v.optional(v.number()),
      bodyLineHeight: v.optional(v.number()),
      bodyLetterSpacing: v.optional(v.number()),
      textEffects: v.optional(v.object({
        category: v.optional(v.object({
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
        })),
        title: v.optional(v.object({
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
        })),
        subtitle: v.optional(v.object({
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
        })),
        body: v.optional(v.object({
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
        })),
      })),
    }),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // 저장된 URL 폴더
  savedUrlFolders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // 저장된 URL (나만의 라이브러리)
  savedUrls: defineTable({
    userId: v.id("users"),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    sourceType: v.optional(
      v.union(v.literal("url"), v.literal("youtube"), v.literal("sns")),
    ),
    folderId: v.optional(v.id("savedUrlFolders")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_folderId", ["userId", "folderId"])
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .searchIndex("search_savedUrls", {
      searchField: "title",
      filterFields: ["userId"],
    }),

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
