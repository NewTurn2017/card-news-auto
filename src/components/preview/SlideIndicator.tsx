"use client";

interface SlideIndicatorProps {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}

export default function SlideIndicator({
  total,
  current,
  onSelect,
}: SlideIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`h-1.5 rounded-full transition-all ${
            i === current
              ? "w-4 bg-blue-500"
              : "w-1.5 bg-white/40"
          }`}
        />
      ))}
    </div>
  );
}
