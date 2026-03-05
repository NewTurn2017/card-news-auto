"use client";

interface GenerationProgressProps {
  status: "idle" | "planning" | "writing" | "done" | "error";
  progress: number;
  onCancel: () => void;
}

export default function GenerationProgress({
  status,
  progress,
  onCancel,
}: GenerationProgressProps) {
  const steps = [
    {
      key: "planning",
      label: "카드뉴스 기획",
      active: status === "planning",
      done: status === "writing" || status === "done",
    },
    {
      key: "writing",
      label: "카드 작성",
      active: status === "writing",
      done: status === "done",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <h2 className="text-xl font-bold">AI가 카드뉴스를 만들고 있어요</h2>
      <p className="text-sm text-muted">잠시만 기다려주세요</p>

      <div className="flex items-center gap-8">
        {steps.map((step) => (
          <div key={step.key} className="flex flex-col items-center gap-2">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                step.done
                  ? "border-accent bg-accent text-background"
                  : step.active
                    ? "border-accent text-accent animate-pulse"
                    : "border-border text-muted"
              }`}
            >
              {step.done ? "✓" : "○"}
            </div>
            <span className="text-xs text-muted">{step.label}</span>
            <span className="text-xs text-muted">
              {step.done ? "완료" : step.active ? "분석중" : "대기중"}
            </span>
          </div>
        ))}
      </div>

      <div className="h-1 w-64 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {status === "error" ? (
        <p className="text-sm text-red-400">오류가 발생했습니다. 다시 시도해주세요.</p>
      ) : (
        <button
          onClick={onCancel}
          className="text-sm text-muted hover:text-foreground"
        >
          ✕ 취소
        </button>
      )}
    </div>
  );
}
