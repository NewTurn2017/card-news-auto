import { NextRequest } from "next/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { getPlanningPrompt, PLANNING_SCHEMA } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const { sourceText, slideCount = 7 } = await req.json();

  if (!sourceText || typeof sourceText !== "string") {
    return Response.json({ error: "sourceText is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const client = getGeminiClient();

        // Phase 1: Planning
        send("phase", { phase: "planning", progress: 0 });

        const planningPrompt = getPlanningPrompt(sourceText, slideCount);
        const planResult = await client.models.generateContent({
          model: GEMINI_MODEL,
          contents: planningPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: PLANNING_SCHEMA,
          },
        });

        const planText = planResult.text ?? "";
        let slides: Array<{
          type: string;
          category?: string;
          title: string;
          subtitle?: string;
          body?: string;
        }>;

        try {
          const parsed = JSON.parse(planText);
          slides = parsed.slides;
        } catch {
          send("error", { error: "Failed to parse planning response" });
          controller.close();
          return;
        }

        send("phase", {
          phase: "planning",
          progress: 100,
          slideCount: slides.length,
        });

        // Phase 2: Build slide data (using structured data, no HTML generation needed for MVP)
        send("phase", { phase: "writing", progress: 0 });

        const cardSlides = slides.map((slide, index) => ({
          id: crypto.randomUUID(),
          order: index,
          type: slide.type as "cover" | "content" | "ending",
          layoutId: index === 0 ? "center-title" : "left-align",
          colorPreset: "dark" as const,
          content: {
            category: slide.category,
            title: slide.title,
            subtitle: slide.subtitle,
            body: slide.body,
          },
          htmlContent: "",
        }));

        for (let i = 0; i < cardSlides.length; i++) {
          send("slide", {
            slideIndex: i,
            progress: Math.round(((i + 1) / cardSlides.length) * 100),
          });
        }

        send("complete", { slides: cardSlides });
      } catch (err) {
        send("error", {
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
