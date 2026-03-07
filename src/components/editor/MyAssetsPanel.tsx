"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Upload, Trash2, Plus, ImageIcon } from "lucide-react";

interface MyAssetsPanelProps {
  onAddOverlay?: (assetId: Id<"userAssets">) => void;
}

type AssetType = "logo" | "watermark" | "stamp" | "image";

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  logo: "로고",
  watermark: "워터마크",
  stamp: "스탬프",
  image: "이미지",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export default function MyAssetsPanel({ onAddOverlay }: MyAssetsPanelProps) {
  const assets = useQuery(api.userAssets.listAssets) ?? [];
  const generateUploadUrl = useMutation(api.userAssets.generateUploadUrl);
  const saveAsset = useMutation(api.userAssets.saveAsset);
  const deleteAsset = useMutation(api.userAssets.deleteAsset);

  const [uploading, setUploading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<Id<"userAssets"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("PNG, JPEG, SVG 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();

      const name = file.name.replace(/\.[^.]+$/, "");
      await saveAsset({
        storageId,
        name,
        type: "image" as AssetType,
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (assetId: Id<"userAssets">) => {
    if (!confirm("이 에셋을 삭제하시겠습니까?")) return;
    await deleteAsset({ assetId });
    if (selectedAssetId === assetId) setSelectedAssetId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Upload Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        <Upload size={14} />
        {uploading ? "업로드 중..." : "이미지 업로드"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleUpload}
        className="hidden"
      />

      {/* Asset Grid */}
      {assets.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          저장된 에셋이 없습니다
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div
              key={asset._id}
              className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-colors ${
                selectedAssetId === asset._id
                  ? "border-accent ring-1 ring-accent/30"
                  : "border-border hover:border-muted"
              }`}
              onClick={() => setSelectedAssetId(
                selectedAssetId === asset._id ? null : asset._id
              )}
            >
              {asset.url ? (
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-surface-hover">
                  <ImageIcon size={20} className="text-muted/30" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
                <p className="truncate text-[10px] text-white">{asset.name}</p>
                <p className="text-[9px] text-white/60">
                  {ASSET_TYPE_LABELS[asset.type as AssetType] ?? asset.type}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(asset._id);
                }}
                className="absolute right-1 top-1 hidden rounded-md bg-black/50 p-1 text-white/80 transition-colors hover:bg-red-500 hover:text-white group-hover:block"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add to Slide Button */}
      {selectedAssetId && onAddOverlay && (
        <button
          onClick={() => {
            onAddOverlay(selectedAssetId);
            setSelectedAssetId(null);
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={12} />
          슬라이드에 추가
        </button>
      )}
    </div>
  );
}
