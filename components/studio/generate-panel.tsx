"use client"

import { useState } from "react"
import { Sparkles, Loader2, Plus, X, Image as ImageIcon, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface BatchJob {
  prompt: string
  count: number
  useRefs: boolean
}

interface GeneratePanelProps {
  onGenerateBatch: (
    jobs: BatchJob[],
    aspectRatio: string,
    imageSize: string,
  ) => Promise<void>
  generating: boolean
  disabled: boolean
  refImageCount: number
  progress?: { done: number; total: number } | null
}

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1" },
  { label: "9:16", value: "9:16" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
]

const IMAGE_SIZES = [
  { label: "1K", value: "1K", hint: "기본" },
  { label: "2K", value: "2K", hint: "고화질" },
  { label: "4K", value: "4K", hint: "초고화질 ($0.24/장)" },
]

interface PromptRow {
  id: string
  text: string
  count: number
  useRefs: boolean
}

const newRow = (useRefs: boolean): PromptRow => ({
  id: Math.random().toString(36).slice(2),
  text: "",
  count: 1,
  useRefs,
})

export function GeneratePanel({
  onGenerateBatch,
  generating,
  disabled,
  refImageCount,
  progress,
}: GeneratePanelProps) {
  const [rows, setRows] = useState<PromptRow[]>([newRow(refImageCount > 0)])
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [imageSize, setImageSize] = useState("1K")

  const updateRow = (id: string, patch: Partial<PromptRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, newRow(refImageCount > 0)])
  }

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  const validJobs = rows
    .filter((r) => r.text.trim().length > 0)
    .map((r) => ({
      prompt: r.text.trim(),
      count: Math.max(1, Math.min(20, r.count)),
      useRefs: r.useRefs,
    }))

  const totalImages = validJobs.reduce((s, j) => s + j.count, 0)

  const handleGenerate = async () => {
    if (validJobs.length === 0 || generating || disabled) return
    await onGenerateBatch(validJobs, aspectRatio, imageSize)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">이미지 생성</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/40">비율</span>
            <div className="flex gap-1">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    aspectRatio === ar.value
                      ? "bg-white text-black"
                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/40">해상도</span>
            <div className="flex gap-1">
              {IMAGE_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setImageSize(s.value)}
                  title={s.hint}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    imageSize === s.value
                      ? s.value === "4K"
                        ? "bg-amber-400 text-black"
                        : "bg-white text-black"
                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-white/30 mt-2 w-5 shrink-0">#{idx + 1}</span>

              <Textarea
                value={row.text}
                onChange={(e) => updateRow(row.id, { text: e.target.value })}
                placeholder="생성할 이미지에 대한 프롬프트를 입력하세요..."
                rows={2}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-sm flex-1"
              />

              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  title="삭제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pl-7">
              {/* 수량 컨트롤 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-white/40 mr-1">수량</span>
                <button
                  onClick={() => updateRow(row.id, { count: Math.max(1, row.count - 1) })}
                  className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={row.count}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1
                    updateRow(row.id, { count: Math.max(1, Math.min(20, v)) })
                  }}
                  className="w-10 h-6 rounded bg-white/5 border border-white/10 text-center text-xs text-white focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={() => updateRow(row.id, { count: Math.min(20, row.count + 1) })}
                  className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* 참조 이미지 사용 토글 */}
              <label
                className={`flex items-center gap-1.5 text-xs cursor-pointer ${
                  refImageCount === 0 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={row.useRefs && refImageCount > 0}
                  onChange={(e) => updateRow(row.id, { useRefs: e.target.checked })}
                  disabled={refImageCount === 0}
                  className="rounded border-white/20 bg-white/5 accent-white"
                />
                <ImageIcon className="w-3 h-3 text-white/40" />
                <span className="text-white/50">
                  참조 사용
                  {refImageCount > 0 && (
                    <span className="text-white/30 ml-1">({refImageCount}장)</span>
                  )}
                </span>
              </label>
            </div>
          </div>
        ))}

        <button
          onClick={addRow}
          disabled={generating}
          className="w-full py-2 rounded-xl border border-dashed border-white/10 text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
          프롬프트 추가
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-white/40">
          {validJobs.length > 0 ? (
            <>
              <span className="text-white/70 font-medium">{validJobs.length}개</span> 프롬프트 ·
              총 <span className="text-white/70 font-medium">{totalImages}장</span> 생성 예정
            </>
          ) : (
            "프롬프트를 입력해주세요"
          )}
        </p>

        <Button
          onClick={handleGenerate}
          disabled={validJobs.length === 0 || generating || disabled}
          className="bg-white text-black hover:bg-white/90 disabled:opacity-30"
          size="sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              {progress
                ? `${progress.done}/${progress.total} 생성 중...`
                : "생성 중..."}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {totalImages > 1 ? `${totalImages}장 생성` : "생성"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
