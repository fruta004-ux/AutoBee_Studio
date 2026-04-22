"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { StickyNote, Check, Loader2, X } from "lucide-react"

interface NotesPanelProps {
  projectId: string
  projectName?: string
  initialNotes: string
  onSave: (notes: string) => Promise<boolean>
}

type SaveState = "idle" | "saving" | "saved" | "error"

export function NotesPanel({ projectId, projectName, initialNotes, onSave }: NotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [open, setOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(initialNotes)

  useEffect(() => {
    setNotes(initialNotes)
    lastSaved.current = initialNotes
    setSaveState("idle")
  }, [projectId, initialNotes])

  const saveNotes = useCallback(
    async (val: string) => {
      if (val === lastSaved.current) return
      setSaveState("saving")
      const ok = await onSave(val)
      if (ok) {
        lastSaved.current = val
        setSaveState("saved")
        setTimeout(() => {
          setSaveState((s) => (s === "saved" ? "idle" : s))
        }, 1500)
      } else {
        setSaveState("error")
      }
    },
    [onSave],
  )

  const handleChange = (val: string) => {
    setNotes(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveNotes(val)
    }, 800)
  }

  const handleClose = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveNotes(notes)
    setOpen(false)
  }

  const hasContent = notes.trim().length > 0

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-6 top-1/2 -translate-y-1/2 z-40 group"
        title="메모"
      >
        <div className="relative w-12 h-12 rounded-full bg-zinc-800 border border-white/10 shadow-lg flex items-center justify-center hover:bg-zinc-700 hover:border-white/20 transition-all hover:scale-110">
          <StickyNote className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          {hasContent && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 ring-2 ring-zinc-800" />
          )}
        </div>
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-black/80 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          메모
        </span>
      </button>

      {/* 모달 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-yellow-400/80" />
                <h2 className="text-sm font-medium">
                  메모
                  {projectName && (
                    <span className="text-white/40 ml-2">— {projectName}</span>
                  )}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[10px]">
                  {saveState === "saving" && (
                    <span className="flex items-center gap-1 text-white/40">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      저장중
                    </span>
                  )}
                  {saveState === "saved" && (
                    <span className="flex items-center gap-1 text-green-400/80">
                      <Check className="w-3 h-3" />
                      저장됨
                    </span>
                  )}
                  {saveState === "error" && (
                    <span className="text-red-400/80">저장 실패</span>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-hidden p-6">
              <textarea
                value={notes}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="이 프로젝트에 대한 메모를 자유롭게 적어보세요. 자동 저장됩니다."
                className="w-full h-full min-h-[300px] px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 resize-none leading-relaxed"
                autoFocus
              />
            </div>

            <div className="px-6 py-3 border-t border-white/10 text-[11px] text-white/30 flex items-center justify-between">
              <span>입력하면 자동으로 저장됩니다</span>
              <span>{notes.length.toLocaleString()}자</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
