"use client"

import { useState } from "react"
import { Plus, Trash2, FolderOpen, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: Project | null
  onSelect: (project: Project) => void
  onCreate: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  loading: boolean
}

export function ProjectSelector({
  projects,
  selectedProject,
  onSelect,
  onCreate,
  onDelete,
  loading,
}: ProjectSelectorProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await onCreate(newName.trim())
    setNewName("")
    setShowCreate(false)
    setCreating(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("프로젝트를 삭제하시겠습니까? 모든 이미지가 삭제됩니다.")) return
    await onDelete(id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">프로젝트</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/5"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="프로젝트 이름"
            className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            size="sm"
            className="h-8 bg-white text-black hover:bg-white/90 shrink-0"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : "생성"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
        </div>
      ) : projects.length === 0 ? (
        <p className="text-xs text-white/20 py-2">프로젝트를 생성해주세요</p>
      ) : (
        <div className="space-y-1">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                selectedProject?.id === p.id
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              <span className="text-sm truncate">{p.name}</span>
              <button
                onClick={(e) => handleDelete(e, p.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
              >
                <Trash2 className="w-3 h-3 text-white/30 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
