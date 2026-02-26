"use client"

import { useState } from "react"
import { X, RotateCcw, Trash2, Download, Pencil, Send } from "lucide-react"

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
  editHistory?: string[]
}

export function Lightbox({ image, onClose, onRegenerate, onDelete, onEdit, editHistory = [] }: LightboxProps) {
  const [showEditPanel, setShowEditPanel] = useState(false)
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
    if (!editPrompt.trim()) return
    onEdit(image, editPrompt.trim())
    setEditPrompt("")
    setShowEditPanel(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex"
      onClick={onClose}
    >
      {/* 이미지 영역 */}
      <div className={`flex-1 flex items-center justify-center p-4 ${showEditPanel ? "pr-0" : ""}`}>
        <img
          src={image.public_url}
          alt=""
          className="max-w-full max-h-[calc(100vh-80px)] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 수정 패널 (우측 사이드) */}
      {showEditPanel && (
        <div
          className="w-80 bg-zinc-900 border-l border-white/10 flex flex-col h-full shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-medium text-white/70">이미지 수정</span>
            <button
              onClick={() => setShowEditPanel(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>

          {/* 수정 히스토리 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* 원본 프롬프트 */}
            {image.prompt_text && (
              <div className="space-y-1">
                <p className="text-[10px] text-white/30">원본 프롬프트</p>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-xs text-white/50 leading-relaxed">{image.prompt_text}</p>
                </div>
              </div>
            )}

            {/* 이전 수정 내역 */}
            {editHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/30">수정 이력</p>
                {editHistory.map((h, i) => (
                  <div key={i} className="bg-blue-500/10 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-300/70 leading-relaxed">{h}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="수정 지시를 입력하세요..."
                rows={3}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleEdit()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-white/20">Ctrl+Enter로 전송</span>
              <button
                onClick={handleEdit}
                disabled={!editPrompt.trim()}
                className="h-8 px-4 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/90 disabled:opacity-30 flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 버튼 */}
      <div className="absolute top-4 right-4 flex gap-2 z-10" style={{ right: showEditPanel ? "336px" : "16px" }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowEditPanel(!showEditPanel)
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            showEditPanel ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
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

      {/* 하단 프롬프트 표시 */}
      {image.prompt_text && !showEditPanel && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-xs text-white/40 bg-black/50 rounded-lg px-3 py-2 inline-block max-w-lg truncate">
            {image.prompt_text}
          </p>
        </div>
      )}
    </div>
  )
}
