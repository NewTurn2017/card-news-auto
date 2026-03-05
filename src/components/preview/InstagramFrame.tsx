"use client";

import SlideIndicator from "./SlideIndicator";

interface InstagramFrameProps {
  profileName: string;
  children: React.ReactNode;
  totalSlides: number;
  currentSlide: number;
  onSlideSelect: (index: number) => void;
}

export default function InstagramFrame({
  profileName,
  children,
  totalSlides,
  currentSlide,
  onSlideSelect,
}: InstagramFrameProps) {
  return (
    <div className="flex flex-col bg-black">
      {/* Profile header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
          D
        </div>
        <span className="text-sm font-semibold text-white">{profileName}</span>
        <span className="ml-auto text-white">•••</span>
      </div>

      {/* Card content */}
      <div className="relative">{children}</div>

      {/* Action bar */}
      <div className="flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center">
          <div className="flex gap-3 text-white">
            <span className="text-xl">♡</span>
            <span className="text-xl">💬</span>
            <span className="text-xl">➤</span>
          </div>
          <div className="mx-auto">
            <SlideIndicator
              total={totalSlides}
              current={currentSlide}
              onSelect={onSlideSelect}
            />
          </div>
          <span className="text-xl text-white">☐</span>
        </div>
        <p className="text-xs font-semibold text-white">좋아요 1,234개</p>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around border-t border-white/10 py-2 text-white">
        <span className="text-lg">⌂</span>
        <span className="text-lg">◎</span>
        <span className="text-lg">⊞</span>
        <span className="text-lg">▶</span>
        <span className="text-lg">◉</span>
      </div>
    </div>
  );
}
