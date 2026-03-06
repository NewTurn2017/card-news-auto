"use node";
import { action } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import Firecrawl from "@mendable/firecrawl-js";
import { GoogleGenAI } from "@google/genai";
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
  throw new ConvexError("API_KEY_REQUIRED");
}

async function summarizeWithGemini(apiKey: string, content: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `다음 콘텐츠를 카드뉴스 제작에 적합하게 핵심 내용을 정리해주세요.
- 주요 포인트 5~8개로 구조화
- 각 포인트는 한 문장으로 간결하게
- 통계나 수치가 있으면 포함
- 한국어로 작성

콘텐츠:
${content.slice(0, 10000)}`,
  });
  return response.text ?? "";
}

// ─── URL 크롤링 ─────────────────────────────────────────────

export const collectFromUrl = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
  },
  handler: async (ctx, { projectId, url }) => {
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "collecting",
      progress: 10,
    });

    const firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY!,
    });
    const result = await firecrawl.scrape(url, {
      formats: ["markdown"],
    });

    if (!result.markdown) throw new Error("Scraping failed: no content extracted");

    const apiKey = await getDecryptedApiKey(ctx);
    const summary = await summarizeWithGemini(apiKey, result.markdown);

    await ctx.runMutation(internal.sources.createSource, {
      projectId,
      type: "url",
      url,
      rawContent: result.markdown ?? "",
      summary,
    });

    await ctx.runMutation(internal.projects.updateProjectInternal, {
      projectId,
      sourceContent: summary,
      status: "draft",
      progress: 100,
    });

    // Extract page title from Firecrawl metadata
    const pageTitle = (result as { metadata?: { title?: string } }).metadata?.title ?? "";

    // Update project title if page title is available
    if (pageTitle) {
      await ctx.runMutation(internal.projects.updateProjectTitle, {
        projectId,
        title: pageTitle,
      });
    }

    return { success: true, summary, title: pageTitle };
  },
});

// ─── SNS 스크랩 (WithGenie API) ────────────────────────────

const WITHGENIE_BASE_URL = "https://api.codewithgenie.com";

export const collectFromSns = action({
  args: {
    projectId: v.id("projects"),
    platform: v.union(
      v.literal("threads"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("x"),
    ),
    username: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, platform, username, limit = 5 }) => {
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "collecting",
      progress: 10,
    });

    const response = await fetch(`${WITHGENIE_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.WITHGENIE_API_KEY!,
      },
      body: JSON.stringify({
        platform,
        username: username.replace("@", ""),
        limit,
        offline: false,
        refresh: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Rate limit exceeded");
      throw new Error(`SNS scrape failed: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.items ?? [];

    const rawContent = posts
      .map((post: { text: string }, i: number) => `[Post ${i + 1}]\n${post.text}`)
      .join("\n\n---\n\n");

    const apiKey = await getDecryptedApiKey(ctx);
    const summary = await summarizeWithGemini(apiKey, rawContent);

    await ctx.runMutation(internal.sources.createSource, {
      projectId,
      type: "sns",
      platform,
      username,
      rawContent,
      summary,
    });

    await ctx.runMutation(internal.projects.updateProjectInternal, {
      projectId,
      sourceContent: summary,
      status: "draft",
      progress: 100,
    });

    return { success: true, postCount: posts.length, summary };
  },
});

// ─── 웹 검색 (WithGenie + Gemini Fallback) ─────────────────

export const collectFromSearch = action({
  args: {
    projectId: v.id("projects"),
    query: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, query, region = "kr-ko" }) => {
    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "collecting",
      progress: 10,
    });

    let rawContent = "";
    let searchSources: { title: string; url: string }[] = [];

    // 1차: WithGenie Search API
    try {
      const genieRes = await fetch(`${WITHGENIE_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.WITHGENIE_API_KEY!,
        },
        body: JSON.stringify({ query, max_results: 10, region }),
      });

      if (genieRes.ok) {
        const genieData = await genieRes.json();
        searchSources = (genieData.items ?? []).map(
          (item: { title: string; url: string }) => ({
            title: item.title,
            url: item.url,
          }),
        );
        rawContent = (genieData.items ?? [])
          .map(
            (item: { title: string; snippet: string }) =>
              `### ${item.title}\n${item.snippet}`,
          )
          .join("\n\n");
      }
    } catch {
      // WithGenie 실패 시 Gemini fallback
    }

    // 2차: Gemini Search Grounding (fallback)
    if (!rawContent) {
      const apiKey = await getDecryptedApiKey(ctx);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `다음 주제에 대해 최신 정보를 검색하고 정리해주세요: ${query}`,
        config: { tools: [{ googleSearch: {} }] },
      });
      rawContent = response.text ?? "";
    }

    const apiKey = await getDecryptedApiKey(ctx);
    const summary = await summarizeWithGemini(apiKey, rawContent);

    await ctx.runMutation(internal.sources.createSource, {
      projectId,
      type: "search",
      query,
      rawContent,
      summary,
    });

    await ctx.runMutation(internal.projects.updateProjectInternal, {
      projectId,
      sourceContent: summary,
      status: "draft",
      progress: 100,
    });

    return { success: true, content: summary, sources: searchSources };
  },
});

// ─── YouTube 영상 분석 (Gemini Multimodal) ──────────────────

const YT_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]+/;

export const collectFromYoutube = action({
  args: {
    projectId: v.id("projects"),
    youtubeUrl: v.string(),
  },
  handler: async (ctx, { projectId, youtubeUrl }) => {
    if (!YT_URL_REGEX.test(youtubeUrl)) {
      throw new Error("유효한 YouTube URL이 아닙니다.");
    }

    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "collecting",
      progress: 10,
    });

    const apiKey = await getDecryptedApiKey(ctx);
    const ai = new GoogleGenAI({ apiKey });

    // Phase 1: 영상 분석 (multimodal - 시각 + 청각)
    const analysisResult = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: "video/*",
                fileUri: youtubeUrl,
              },
            },
            {
              text: `이 YouTube 영상을 분석하여 인스타그램 카드뉴스 제작에 적합한 핵심 내용을 추출해주세요.

다음 형식으로 구조화해주세요:
1. 영상 주제 (한 줄 요약)
2. 핵심 메시지 5~8개 (각각 한 문장으로 간결하게)
3. 인사이트 또는 시사점 2~3개
4. 통계/수치가 있으면 반드시 포함
5. 한국어로 작성

카드뉴스는 짧고 임팩트 있는 문장이 중요합니다. 추상적 표현 대신 구체적 사실 위주로 정리해주세요.`,
            },
          ],
        },
      ],
      config: { temperature: 0.3, maxOutputTokens: 8192 },
    });

    const analysisText = analysisResult.text ?? "";
    if (!analysisText.trim()) {
      throw new Error("영상 분석 결과가 비어있습니다. 비공개이거나 분석할 수 없는 영상일 수 있습니다.");
    }

    await ctx.runMutation(internal.projects.updateProjectProgress, {
      projectId,
      status: "collecting",
      progress: 60,
    });

    // Phase 2: 카드뉴스용 요약 구조화 (text-only)
    const summary = await summarizeWithGemini(apiKey, analysisText);

    await ctx.runMutation(internal.sources.createSource, {
      projectId,
      type: "youtube",
      url: youtubeUrl,
      rawContent: analysisText,
      summary,
    });

    await ctx.runMutation(internal.projects.updateProjectInternal, {
      projectId,
      sourceContent: summary,
      status: "draft",
      progress: 100,
    });

    // Extract title from first line of analysis
    const firstLine = analysisText.split("\n").find((l) => l.trim().length > 0)?.replace(/^[#\-*\d.)\s]+/, "").trim() ?? "";
    if (firstLine) {
      await ctx.runMutation(internal.projects.updateProjectTitle, {
        projectId,
        title: firstLine.slice(0, 100),
      });
    }

    return { success: true, summary };
  },
});
