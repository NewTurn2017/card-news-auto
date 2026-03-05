import { NextRequest } from "next/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { getHtmlGenerationPrompt } from "@/lib/prompts";
import { layouts } from "@/data/layouts";

export async function POST(req: NextRequest) {
  const { slide } = await req.json();

  if (!slide || !slide.title) {
    return Response.json({ error: "slide data is required" }, { status: 400 });
  }

  try {
    const client = getGeminiClient();
    const layout = layouts.find((l) => l.id === slide.layoutId) ?? layouts[0];

    const prompt = getHtmlGenerationPrompt({
      type: slide.type || "content",
      category: slide.category,
      title: slide.title,
      subtitle: slide.subtitle,
      body: slide.body,
      colorPreset: slide.colorPreset || "dark",
      layoutDescription: `${layout.name} - 텍스트 위치: ${layout.textPosition}, 정렬: ${layout.textAlign}`,
    });

    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          "당신은 카드뉴스 HTML 디자이너입니다. 요청된 규격에 맞는 HTML만 출력하세요.",
      },
    });

    let html = result.text ?? "";
    // Strip markdown code fences if present
    html = html
      .replace(/^```html?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    return Response.json({ html });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
