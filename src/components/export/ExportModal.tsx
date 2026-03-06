"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { exportSlideToPng, exportAllPng, exportPdf } from "@/lib/export-png";

type ExportFormat = "png" | "zip" | "pdf";

interface ExportModalProps {
  slideRefs: React.RefObject<HTMLDivElement | null>[];
  allSlideRefs: React.RefObject<(HTMLDivElement | null)[]>;
  projectTitle: string;
  currentSlideIndex: number;
  totalSlides: number;
  onClose: () => void;
}

export default function ExportModal({
  slideRefs,
  allSlideRefs,
  projectTitle,
  currentSlideIndex,
  totalSlides,
  onClose,
}: ExportModalProps) {
  const [selected, setSelected] = useState<ExportFormat>("png");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      if (selected === "png") {
        // slideRefs always has one element (the currently rendered slide)
        const el = slideRefs[0]?.current;
        if (!el) throw new Error("슬라이드 요소를 찾을 수 없습니다.");
        const paddedIdx = String(currentSlideIndex + 1).padStart(2, "0");
        await exportSlideToPng(el, `${projectTitle}_slide_${paddedIdx}.png`);
      } else if (selected === "zip") {
        const elements = (allSlideRefs.current ?? [])
          .slice(0, totalSlides)
          .filter((el): el is HTMLDivElement => el !== null);
        if (elements.length === 0) throw new Error("슬라이드 요소를 찾을 수 없습니다.");
        await exportAllPng(elements, projectTitle);
      } else if (selected === "pdf") {
        const elements = (allSlideRefs.current ?? [])
          .slice(0, totalSlides)
          .filter((el): el is HTMLDivElement => el !== null);
        if (elements.length === 0) throw new Error("슬라이드 요소를 찾을 수 없습니다.");
        await exportPdf(elements, projectTitle);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기 실패");
    } finally {
      setIsExporting(false);
    }
  };

  const OPTIONS: { value: ExportFormat; label: string; desc: string }[] = [
    { value: "png", label: "PNG (현재 슬라이드)", desc: "현재 슬라이드 1장을 PNG로 저장" },
    { value: "zip", label: "PNG ZIP (전체)", desc: "모든 슬라이드를 PNG로 압축 저장" },
    { value: "pdf", label: "PDF (전체)", desc: "모든 슬라이드를 하나의 PDF로 저장" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">내보내기</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
                selected === opt.value
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-muted"
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  selected === opt.value ? "text-accent" : "text-foreground"
                }`}
              >
                {opt.label}
              </span>
              <span className="mt-0.5 text-xs text-muted">{opt.desc}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-xs text-muted hover:text-foreground"
          >
            취소
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 rounded-lg bg-accent py-2 text-xs font-medium text-white transition-opacity disabled:opacity-60 hover:opacity-90"
          >
            {isExporting ? "내보내는 중..." : "내보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}
