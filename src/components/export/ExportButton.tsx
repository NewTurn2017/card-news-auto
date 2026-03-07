"use client";

import { useState } from "react";
import ExportModal from "./ExportModal";

interface ExportButtonProps {
  allSlideRefs: React.RefObject<(HTMLDivElement | null)[]>;
  projectTitle: string;
  currentSlideIndex: number;
  totalSlides: number;
}

export default function ExportButton({
  allSlideRefs,
  projectTitle,
  currentSlideIndex,
  totalSlides,
}: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        내보내기
      </button>

      {showModal && (
        <ExportModal
          allSlideRefs={allSlideRefs}
          projectTitle={projectTitle}
          currentSlideIndex={currentSlideIndex}
          totalSlides={totalSlides}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
