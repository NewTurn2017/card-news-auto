"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface OverlayImageProps {
  assetId: Id<"userAssets">;
  x: number;
  y: number;
  width: number;
  opacity: number;
}

export default function OverlayImage({
  assetId,
  x,
  y,
  width,
  opacity,
}: OverlayImageProps) {
  // listAssets returns assets with resolved urls
  const assets = useQuery(api.userAssets.listAssets) ?? [];
  const asset = assets.find((a) => a._id === assetId);

  if (!asset?.url) return null;

  return (
    <img
      src={asset.url}
      alt={asset.name}
      className="pointer-events-none absolute z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        opacity: opacity / 100,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}
