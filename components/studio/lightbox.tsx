"use client"

import { X, RotateCcw, Trash2, Download } from "lucide-react"

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

interface LightboxProps {
  image: GeneratedImage | null
  onClose: () => void
  onRegenerate: (image: GeneratedImage) => void
  onDelete: (image: GeneratedImage) => void
}

export function Lightbox({ image, onClose, onRegenerate, onDelete }: LightboxProps) {
  if (!image) return null

  const handleDownloadSingle = async () => {
    const response = await fetch(image.public_url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `studio-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRegenerate(image)
          }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          title="재생성"
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDownloadSingle()
          }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          title="다운로드"
        >
          <Download className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(image)
          }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500/30 transition-colors"
          title="삭제"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {image.prompt_text && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-xs text-white/40 bg-black/50 rounded-lg px-3 py-2 inline-block max-w-lg truncate">
            {image.prompt_text}
          </p>
        </div>
      )}

      <img
        src={image.public_url}
        alt=""
        className="max-w-full max-h-[calc(100vh-120px)] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
