"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { StickyNote, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface NotesPanelProps {
  projectId: string
  initialNotes: string
  onSave: (notes: string) => Promise<boolean>
}

type SaveState = "idle" | "saving" | "saved" | "error"

export function NotesPanel({ projectId, initialNotes, onSave }: NotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [collapsed, setCollapsed] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(initialNotes)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    setNotes(initialNotes)
    lastSaved.current = initialNotes
    projectIdRef.current = projectId
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

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveNotes(notes)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <StickyNote className="w-4 h-4 text-white/40" />
          <span>메모</span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-white/30" />
          )}
        </button>

        <div className="flex items-center gap-1 text-[10px]">
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
      </div>

      {!collapsed && (
        <textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="이 프로젝트에 대한 메모를 자유롭게 적어보세요. 자동 저장됩니다."
          rows={6}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 resize-y leading-relaxed"
        />
      )}
    </div>
  )
}
