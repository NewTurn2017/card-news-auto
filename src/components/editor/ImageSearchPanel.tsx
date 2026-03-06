"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { SlideImage } from "@/types";

interface ImageResult {
  id: string;
  thumbUrl: string;
  url: string;
  attribution: string;
}

interface ImageSearchPanelProps {
  onSelect: (image: SlideImage) => void;
  onClose: () => void;
}

export default function ImageSearchPanel({ onSelect, onClose }: ImageSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchImagesAction = useAction(api.actions.images.searchImages);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const images = await searchImagesAction({ query: query.trim(), page, perPage: 12 });
      setResults(
        images.map((img) => ({
          id: img.id,
          thumbUrl: img.thumbUrl,
          url: img.url,
          attribution: img.attribution,
        })),
      );
    } catch (err) {
      console.error("Image search error:", err);
    } finally {
      setIsSearching(false);
    }
    setSubmittedQuery(query.trim());
  };

  const handleSelect = (img: ImageResult) => {
    onSelect({
      url: img.url,
      opacity: 60,
      position: { x: 50, y: 50 },
      size: 100,
      fit: "cover",
    });
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이미지 검색..."
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          검색
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </form>

      {/* Loading state */}
      {isSearching && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {/* Results grid */}
      {submittedQuery && !isSearching && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((img) => (
              <button
                key={img.id}
                onClick={() => handleSelect(img)}
                className="group relative aspect-square overflow-hidden rounded border border-border transition-colors hover:border-accent"
                title={img.attribution}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbUrl}
                  alt={img.attribution}
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-border px-2 py-1 text-xs text-muted disabled:opacity-40 hover:text-foreground"
            >
              이전
            </button>
            <span className="text-xs text-muted">{page} 페이지</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              다음
            </button>
          </div>
        </>
      )}

      {!submittedQuery && (
        <p className="text-center text-xs text-muted">검색어를 입력하세요</p>
      )}
    </div>
  );
}
