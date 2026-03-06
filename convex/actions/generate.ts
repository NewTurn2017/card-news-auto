"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { internal } from "../_generated/api";
import { decrypt } from "../lib/crypto";

async function getDecryptedApiKey(ctx: { runQuery: Function }) {
  const profile = await ctx.runQuery(internal.userProfiles.getProfileByAuth);
  if (profile?.geminiApiKey) {
    // Encrypted format: "iv:authTag:encrypted"
    if (profile.geminiApiKey.includes(":")) {
      return decrypt(profile.geminiApiKey);
    }
    // Plaintext key (legacy or not yet encrypted)
    return profile.geminiApiKey;
  }
  throw new Error("API_KEY_REQUIRED");
}

function getPlanningPrompt(sourceText: string, slideCount: number = 7) {
  return `당신은 인스타그램 카드뉴스 전문 에디터입니다.
다음 텍스트를 인스타그램 카드뉴스 ${slideCount}장으로 구조화해주세요.

규칙:
- 모든 슬라이드에 category, title, subtitle, body를 반드시 포함해주세요
- 1장: 커버 (카테고리 + 임팩트 있는 제목 + 부제, body는 한줄 요약)
- 2~${slideCount - 1}장: 핵심 내용 (한 장에 한 가지 메시지, 제목 + 본문, subtitle은 소제목)
- ${slideCount}장: 마무리 (핵심 요약 또는 행동 유도)
- category: 영문 대문자 (예: "AI & INSIGHT", "TECH", "TREND") — 모든 장에 동일하게
- title: 2줄 이내, 짧고 강렬하게
- subtitle: 부제 또는 소제목 (빈 값 불가)
- body: 본문 내용 (빈 값 불가)

원본 텍스트:
${sourceText}`;
}

const PLANNING_SCHEMA = {
  type: "object" as const,
  properties: {
    slides: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: ["cover", "content", "ending"],
          },
          category: { type: "string" as const },
          title: { type: "string" as const },
          subtitle: { type: "string" as const },
          body: { type: "string" as const },
        },
        required: ["type", "category", "title", "subtitle", "body"],
      },
    },
  },
  required: ["slides"],
};

function getDefaultStyle() {
  return {
    bgType: "solid" as const,
    bgColor: "#0f0f0f",
    textColor: "#ffffff",
    accentColor: "#4ae3c0",
    fontFamily: "'Noto Sans KR', sans-serif",
  };
}

// ─── AI 카드뉴스 생성 ──────────────────────────────────────

export const generateCardNews = action({
  args: {
    projectId: v.id("projects"),
    slideCount: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, slideCount = 7 }) => {
    const apiKey = await getDecryptedApiKey(ctx);
    const ai = new GoogleGenAI({ apiKey });

    const project = await ctx.runQuery(internal.projects.getProjectInternal, {
      projectId,
    });
    if (!project?.sourceContent) throw new Error("No source content");

    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "generating",
      progress: 0,
    });

    // Phase 1: 콘텐츠 구조화 (Structured Output)
    const planResult = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: getPlanningPrompt(project.sourceContent, slideCount),
      config: {
        responseMimeType: "application/json",
        responseSchema: PLANNING_SCHEMA,
      },
    });

    const plan = JSON.parse(planResult.text ?? "{}");

    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "generating",
      progress: 30,
    });

    // Phase 2: 슬라이드 생성
    for (let i = 0; i < plan.slides.length; i++) {
      const slide = plan.slides[i];
      await ctx.runMutation(internal.slides.createSlideInternal, {
        projectId,
        order: i,
        type: slide.type,
        layoutId: i === 0 ? "center" : "center-left",
        content: {
          category: slide.category,
          title: slide.title,
          subtitle: slide.subtitle,
          body: slide.body,
        },
        style: getDefaultStyle(),
      });

      const progress = 30 + Math.round(((i + 1) / plan.slides.length) * 70);
      await ctx.runMutation(internal.projects.updateProjectProgress, {
        projectId,
        status: "generating",
        progress,
      });
    }

    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "completed",
      progress: 100,
    });

    return { success: true, slideCount: plan.slides.length };
  },
});

// ─── 개별 슬라이드 AI 개선 ──────────────────────────────────

export const improveSlide = action({
  args: {
    slideId: v.id("slides"),
    instruction: v.string(),
  },
  handler: async (ctx, { slideId, instruction }): Promise<{ title: string; subtitle?: string; body?: string }> => {
    const apiKey = await getDecryptedApiKey(ctx);
    const ai = new GoogleGenAI({ apiKey });

    const slide: Awaited<ReturnType<typeof ctx.runQuery>> = await ctx.runQuery(internal.slides.getSlideInternal, {
      slideId,
    });
    if (!slide) throw new Error("Slide not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = slide as any;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `다음 카드뉴스 슬라이드를 개선해주세요.

현재 슬라이드:
- 제목: ${s.content.title}
${s.content.subtitle ? `- 부제: ${s.content.subtitle}` : ""}
${s.content.body ? `- 본문: ${s.content.body}` : ""}

사용자 요청: ${instruction}

개선된 결과를 JSON으로 반환해주세요.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const },
            subtitle: { type: "string" as const },
            body: { type: "string" as const },
          },
          required: ["title"],
        },
      },
    });

    const improved = JSON.parse(response.text ?? "{}");
    return {
      title: improved.title ?? s.content.title,
      subtitle: improved.subtitle ?? s.content.subtitle,
      body: improved.body ?? s.content.body,
    };
  },
});
