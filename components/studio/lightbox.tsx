"use client"

import { useState } from "react"
import { X, RotateCcw, Trash2, Download, Pencil, Loader2, Send } from "lucide-react"

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
  onEdit: (image: GeneratedImage, editPrompt: string) => void
  editing: boolean
}

export function Lightbox({ image, onClose, onRegenerate, onDelete, onEdit, editing }: LightboxProps) {
  const [showEditInput, setShowEditInput] = useState(false)
  const [editPrompt, setEditPrompt] = useState("")

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

  const handleEdit = () => {
    if (!editPrompt.trim() || editing) return
    onEdit(image, editPrompt.trim())
    setEditPrompt("")
    setShowEditInput(false)
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
            setShowEditInput(!showEditInput)
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            showEditInput ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
          }`}
          title="수정"
        >
          <Pencil className="w-4 h-4 text-white" />
        </button>
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

      {/* 수정 프롬프트 입력 */}
      {showEditInput && (
        <div
          className="absolute top-16 right-4 left-4 sm:left-auto sm:w-96 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 space-y-2">
            <p className="text-xs text-white/40">이 이미지를 어떻게 수정할까요?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="예: 배경을 파란색으로 바꿔줘"
                className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit()
                }}
                autoFocus
                disabled={editing}
              />
              <button
                onClick={handleEdit}
                disabled={!editPrompt.trim() || editing}
                className="h-9 px-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30 flex items-center gap-1.5"
              >
                {editing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {image.prompt_text && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-xs text-white/40 bg-black/50 rounded-lg px-3 py-2 inline-block max-w-lg truncate">
            {image.prompt_text}
          </p>
        </div>
      )}

      {editing && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-black/70 rounded-xl px-6 py-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-sm text-white">수정 중...</span>
          </div>
        </div>
      )}

      <img
        src={image.public_url}
        alt=""
        className={`max-w-full max-h-[calc(100vh-120px)] object-contain transition-opacity ${editing ? "opacity-50" : ""}`}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
