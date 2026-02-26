"use client"

import { useState } from "react"
import {
  ImageIcon,
  CheckSquare,
  Square,
  Download,
  Trash2,
  Loader2,
  Eye,
  MousePointer,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface GeneratedImage {
  id: string
  project_id: string
  prompt_text: string
  storage_path: string
  public_url: string
  aspect_ratio: string
  resolution: string
  created_at: string
}

interface GalleryProps {
  images: GeneratedImage[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onImageClick: (image: GeneratedImage) => void
  onDownload: () => Promise<void>
  onDeleteSelected: () => Promise<void>
  viewMode: "view" | "select"
  onViewModeChange: (mode: "view" | "select") => void
  downloading: boolean
}

export function Gallery({
  images,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onImageClick,
  onDownload,
  onDeleteSelected,
  viewMode,
  onViewModeChange,
  downloading,
}: GalleryProps) {
  const allSelected = images.length > 0 && selectedIds.size === images.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">
            생성된 이미지 ({images.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange("view")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                viewMode === "view"
                  ? "bg-white text-black"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Eye className="w-3 h-3" />
              보기
            </button>
            <button
              onClick={() => onViewModeChange("select")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                viewMode === "select"
                  ? "bg-white text-black"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <MousePointer className="w-3 h-3" />
              선택
            </button>
          </div>

          {viewMode === "select" && images.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={allSelected ? onDeselectAll : onSelectAll}
                className="h-7 text-xs text-white/40 hover:text-white hover:bg-white/5"
              >
                {allSelected ? "전체 해제" : "전체 선택"}
              </Button>

              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownload}
                    disabled={downloading}
                    className="h-7 text-xs text-white/40 hover:text-white hover:bg-white/5"
                  >
                    {downloading ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    다운로드 ({selectedIds.size})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDeleteSelected}
                    className="h-7 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    삭제 ({selectedIds.size})
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 text-sm text-white/20">
          생성된 이미지가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {images.map((img) => {
            const isSelected = selectedIds.has(img.id)

            return (
              <div
                key={img.id}
                onClick={() => {
                  if (viewMode === "view") {
                    onImageClick(img)
                  } else {
                    onToggleSelect(img.id)
                  }
                }}
                className={`relative aspect-square rounded-lg overflow-hidden bg-white/5 cursor-pointer group transition-all ${
                  viewMode === "select" && isSelected
                    ? "ring-2 ring-white ring-offset-1 ring-offset-black"
                    : "hover:ring-1 hover:ring-white/20"
                }`}
              >
                <img
                  src={img.public_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {viewMode === "select" && (
                  <div className="absolute top-1.5 left-1.5">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-white drop-shadow-lg" />
                    ) : (
                      <Square className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    )}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
