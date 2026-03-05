"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/create/TextInput";
import GenerationProgress from "@/components/generate/GenerationProgress";
import { useCardNewsStore } from "@/store/card-news-store";
import type { CardSlide } from "@/types";

export default function CreatePage() {
  const router = useRouter();
  const {
    generationStatus,
    generationProgress,
    setGenerationStatus,
    setGenerationProgress,
    createNewProject,
  } = useCardNewsStore();

  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const handleSubmit = async (text: string) => {
    const controller = new AbortController();
    setAbortController(controller);
    setGenerationStatus("planning");
    setGenerationProgress(0);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setGenerationStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "phase") {
            setGenerationStatus(data.phase);
            if (data.progress !== undefined)
              setGenerationProgress(data.progress);
          } else if (event === "slide") {
            setGenerationStatus("writing");
            setGenerationProgress(data.progress);
          } else if (event === "complete") {
            setGenerationStatus("done");
            const slides = data.slides as CardSlide[];
            const id = createNewProject(text, slides);
            router.push(`/edit/${id}`);
          } else if (event === "error") {
            setGenerationStatus("error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setGenerationStatus("error");
      }
    }
  };

  const handleCancel = () => {
    abortController?.abort();
    setAbortController(null);
    setGenerationStatus("idle");
    setGenerationProgress(0);
  };

  const isGenerating =
    generationStatus === "planning" || generationStatus === "writing";

  return (
    <div className="mx-auto max-w-xl py-12 px-6">
      <h1 className="mb-2 text-2xl font-bold">카드뉴스 만들기</h1>
      <p className="mb-8 text-sm text-muted">
        카드뉴스로 만들 내용을 준비하세요
      </p>

      {isGenerating || generationStatus === "error" ? (
        <GenerationProgress
          status={generationStatus}
          progress={generationProgress}
          onCancel={handleCancel}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <TextInput onSubmit={handleSubmit} isLoading={isGenerating} />

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 text-sm">
              <span>✨</span>
              <span className="font-medium">에시로 시작하기</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              샘플 카드뉴스를 불러와 편집 화면을 체험해보세요
            </p>
            <button
              onClick={() => handleSubmit(SAMPLE_TEXT)}
              className="mt-3 text-xs text-accent hover:underline"
            >
              예시 불러오기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SAMPLE_TEXT = `인공지능(AI)이 바둑에서 인간을 이긴 지 10년이 지났다. 2016년 3월, 구글 딥마인드의 알파고는 세계 최정상급 바둑 기사 이세돌 9단을 4대1로 이겼다. 당시 전 세계는 충격에 빠졌고, AI의 가능성에 대한 논의가 본격화됐다.

10년이 지난 지금, 이세돌 9단이 처음으로 입을 열었다. 그는 "AI와의 대국은 인생에서 가장 값진 경험이었다"고 말했다. "패배가 아니라 발견이었다"는 그의 말은 많은 이들에게 울림을 주었다.

이세돌은 현재 바둑 교육과 AI 연구에 관심을 갖고 있으며, "AI는 인간의 적이 아니라 거울"이라고 강조했다. 그는 AI 시대에 인간이 가져야 할 태도에 대해 깊은 통찰을 나누었다.`;
