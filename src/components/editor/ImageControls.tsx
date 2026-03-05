"use client";

import { useRef } from "react";
import type { SlideImage } from "@/types";

interface ImageControlsProps {
  image?: SlideImage;
  onChange: (image: SlideImage | undefined) => void;
}

export default function ImageControls({ image, onChange }: ImageControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({
      url,
      opacity: 60,
      position: { x: 50, y: 50 },
      size: 100,
      fit: "cover",
    });
  };

  const handleRemove = () => {
    onChange(undefined);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-muted">첨부 이미지</label>

      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground"
        >
          📎 첨부 이미지
        </button>
        {image && (
          <button
            onClick={handleRemove}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
          >
            삭제
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {image && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>투명도</span>
              <span>{image.opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={image.opacity}
              onChange={(e) =>
                onChange({ ...image, opacity: Number(e.target.value) })
              }
              className="w-full accent-accent"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>크기</span>
              <span>{image.size}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              value={image.size}
              onChange={(e) =>
                onChange({ ...image, size: Number(e.target.value) })
              }
              className="w-full accent-accent"
            />
          </div>
          <div className="flex gap-2">
            {(["cover", "contain", "fill"] as const).map((fit) => (
              <button
                key={fit}
                onClick={() => onChange({ ...image, fit })}
                className={`rounded border px-2 py-1 text-xs ${
                  image.fit === fit
                    ? "border-accent text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {fit === "cover" ? "채우기" : fit === "contain" ? "맞추기" : "늘리기"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
