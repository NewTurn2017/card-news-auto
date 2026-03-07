"use client";

import { useState, useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import type { SlideContent } from "@/types";

interface ImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImprove: (instruction: string) => Promise<void>;
  content: SlideContent;
  isImproving: boolean;
}

const QUICK_PROMPTS = [
  { label: "더 짧게", value: "더 짧고 간결하게 줄여주세요" },
  { label: "질문형으로", value: "제목을 질문형으로 바꿔주세요" },
  { label: "임팩트 있게", value: "더 임팩트 있고 강렬하게 개선해주세요" },
  { label: "쉽게 풀어서", value: "쉬운 말로 풀어서 설명해주세요" },
  { label: "전문적으로", value: "더 전문적이고 신뢰감 있는 톤으로 바꿔주세요" },
];

export default function ImproveModal({
  isOpen,
  onClose,
  onImprove,
  content,
  isImproving,
}: ImproveModalProps) {
  const [instruction, setInstruction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isImproving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isImproving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!instruction.trim() || isImproving) return;
    await onImprove(instruction.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isImproving) {
      onClose();
    }
  };

  const contentItems = [
    { label: "카테고리", value: content.category },
    { label: "제목", value: content.title },
    { label: "부제", value: content.subtitle },
    { label: "본문", value: content.body },
  ].filter((item) => item.value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">
              AI 슬라이드 개선
            </h2>
          </div>
          <button
            onClick={() => !isImproving && onClose()}
            disabled={isImproving}
            className="rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Content Preview */}
        <div className="mb-4 rounded-lg border border-border bg-background/50 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            현재 슬라이드 내용
          </p>
          <div className="flex flex-col gap-1">
            {contentItems.map((item) => (
              <div key={item.label} className="flex gap-2 text-xs">
                <span className="shrink-0 text-muted">{item.label}</span>
                <span className="text-foreground line-clamp-2">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Prompt Presets */}
        <div className="mb-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            빠른 프롬프트
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => setInstruction(prompt.value)}
                disabled={isImproving}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  instruction === prompt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-muted hover:text-foreground"
                } disabled:opacity-50`}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instruction Textarea */}
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            어떻게 개선할까요?
          </p>
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 제목을 질문형으로 바꿔줘"
            disabled={isImproving}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-right text-[10px] text-muted/50">
            Cmd+Enter로 실행
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isImproving}
            className="flex-1 rounded-lg border border-border py-2 text-xs text-muted hover:text-foreground disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!instruction.trim() || isImproving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles size={13} />
            {isImproving ? "개선 중..." : "개선하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
