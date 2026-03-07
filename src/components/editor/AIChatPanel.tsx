"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  RefreshCw,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { EditableTextField } from "@/types";

export type AIChatScope = "selected_text" | "current_slide" | "all_slides";

export interface AIChatMessage {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

export interface AIChatPanelProps {
  currentSlideNumber: number;
  input: string;
  isInteractionLocked?: boolean;
  isOpen: boolean;
  isPlanning: boolean;
  lockReason?: string;
  messages: AIChatMessage[];
  onClose: () => void;
  onInputChange: (value: string) => void;
  onScopeChange: (scope: AIChatScope) => void;
  onSubmit: (instruction: string) => void;
  projectTitle: string;
  scope: AIChatScope;
  selectedField?: EditableTextField | null;
  totalSlides: number;
}

const QUICK_PROMPTS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "더 미니멀하게", value: "전체 톤을 더 미니멀하고 정돈된 느낌으로 다듬어줘" },
  { label: "제목 더 임팩트", value: "제목을 더 짧고 임팩트 있게 바꿔줘" },
  { label: "제목 가운데 정렬", value: "현재 슬라이드 제목을 가운데 정렬로 맞춰줘" },
  { label: "좌측 정렬 레이아웃", value: "현재 슬라이드를 좌측 정렬 레이아웃으로 정돈해줘" },
  {
    label: "배경 이미지 찾기",
    value: "전체 각 슬라이드에 어울리는 배경 이미지 검색해서 적용해줘",
  },
  {
    label: "전체 검정 배경",
    value: "전체 배경 동일하게 검정색으로 적용해줘",
  },
];

const SCOPE_LABELS: Record<AIChatScope, string> = {
  selected_text: "선택 텍스트",
  current_slide: "현재 슬라이드",
  all_slides: "전체 슬라이드",
};

const FIELD_LABELS: Record<EditableTextField, string> = {
  category: "카테고리",
  title: "제목",
  subtitle: "부제",
  body: "본문",
};

function formatRelativeTime(createdAt: number): string {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });

  return formatter.format(createdAt);
}

export function AIChatPanel({
  currentSlideNumber,
  input,
  isInteractionLocked = false,
  isOpen,
  isPlanning,
  lockReason,
  messages,
  onClose,
  onInputChange,
  onScopeChange,
  onSubmit,
  projectTitle,
  scope,
  selectedField = null,
  totalSlides,
}: AIChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scopeOptions = useMemo(
    () => [
      { id: "current_slide" as const, label: SCOPE_LABELS.current_slide, disabled: false },
      { id: "selected_text" as const, label: SCOPE_LABELS.selected_text, disabled: !selectedField },
      { id: "all_slides" as const, label: SCOPE_LABELS.all_slides, disabled: false },
    ],
    [selectedField],
  );

  const handleSubmit = (): void => {
    const trimmed = input.trim();
    if (!trimmed || isPlanning || isInteractionLocked) {
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen]);

  if (!isOpen) {
    return null;
  }

  const selectedFieldLabel = selectedField ? FIELD_LABELS[selectedField] : null;

  const panelContent = (
    <div
      aria-busy={isPlanning || isInteractionLocked}
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">AI Chat</h2>
              <p className="truncate text-xs text-muted">{projectTitle}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{SCOPE_LABELS[scope]}</Badge>
            <Badge variant="secondary">
              슬라이드 {currentSlideNumber} / {totalSlides}
            </Badge>
            {selectedFieldLabel && scope === "selected_text" && (
              <Badge variant="secondary">{selectedFieldLabel}</Badge>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl"
          aria-label="AI Chat 닫기"
        >
          <X size={16} />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={`${message.role}-${message.createdAt}`}
                className={cn(
                  "max-w-[92%] rounded-3xl px-4 py-3 text-sm shadow-sm",
                  message.role === "assistant"
                    ? "border border-border bg-background text-foreground"
                    : "ml-auto bg-accent text-white",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      message.role === "assistant" ? "text-muted" : "text-white/80",
                    )}
                  >
                    {message.role === "assistant" ? "AI" : "나"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px]",
                      message.role === "assistant" ? "text-muted" : "text-white/70",
                    )}
                  >
                    {formatRelativeTime(message.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words leading-6">{message.text}</p>
              </div>
            ))
          ) : (
            <div className="flex min-h-full items-center justify-center py-8">
              <div className="max-w-[280px] text-center">
                <p className="text-sm font-medium text-foreground">편하게 요청해 주세요</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  카피 수정부터 정렬, 레이아웃, 배경 이미지 제안까지 채팅처럼 바로 요청할 수 있어요.
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Separator />

      <div className="space-y-3 bg-background px-4 py-4">
        {isInteractionLocked && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {lockReason ?? "현재 편집 상태를 동기화하는 동안 AI 편집 입력이 잠시 잠겨 있습니다."}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {scopeOptions.map((option) => (
            <Button
              key={option.id}
              variant={scope === option.id ? "default" : "outline"}
              size="sm"
              disabled={option.disabled || isInteractionLocked}
              onClick={() => onScopeChange(option.id)}
              className="h-8 rounded-full px-3 text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => onInputChange(prompt.value)}
              disabled={isInteractionLocked}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                input === prompt.value && "border-accent/40 bg-accent/10 text-accent",
              )}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            autoFocus={true}
            value={input}
            rows={3}
            disabled={isPlanning || isInteractionLocked}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 전체 각 슬라이드에 어울리는 배경 이미지를 찾아서 적용해줘"
            className="min-h-[92px] resize-none rounded-2xl bg-background"
          />

          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isPlanning || isInteractionLocked}
            size="icon"
            className="h-11 w-11 rounded-2xl shrink-0"
            aria-label="AI 요청 보내기"
          >
            {isPlanning ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <SendHorizonal size={16} />
            )}
          </Button>
        </div>

        <p className="text-[11px] text-muted">Cmd/Ctrl + Enter로 바로 전송</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-[360px] shrink-0 border-l border-border bg-background md:flex md:flex-col">
        {panelContent}
      </aside>

      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/45 md:hidden"
        onClick={onClose}
        aria-label="AI Chat 닫기"
      />
      <section className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] min-h-[60vh] flex-col rounded-t-[28px] border border-border bg-background shadow-2xl md:hidden">
        <div className="flex justify-center py-3">
          <span className="h-1.5 w-12 rounded-full bg-border" />
        </div>
        <div className="min-h-0 flex-1">{panelContent}</div>
      </section>
    </>
  );
}
