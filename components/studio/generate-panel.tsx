"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface GeneratePanelProps {
  onGenerate: (prompt: string, aspectRatio: string) => Promise<void>
  generating: boolean
  disabled: boolean
  refImageCount: number
}

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1" },
  { label: "9:16", value: "9:16" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
]

export function GeneratePanel({
  onGenerate,
  generating,
  disabled,
  refImageCount,
}: GeneratePanelProps) {
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("1:1")

  const handleGenerate = () => {
    if (!prompt.trim() || generating || disabled) return
    onGenerate(prompt.trim(), aspectRatio)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-white/40" />
        <span className="text-sm font-medium text-white/70">이미지 생성</span>
      </div>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="생성할 이미지에 대한 프롬프트를 입력하세요..."
        rows={3}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleGenerate()
          }
        }}
      />

      <div className="flex items-center gap-3">
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

        <div className="flex-1" />

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating || disabled}
          className="bg-white text-black hover:bg-white/90 disabled:opacity-30"
          size="sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              생성
              {refImageCount > 0 && (
                <span className="ml-1 text-[10px] opacity-60">
                  ({refImageCount}장 참조)
                </span>
              )}
            </>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-white/20">
        Ctrl+Enter로 빠르게 생성할 수 있습니다
      </p>
    </div>
  )
}
