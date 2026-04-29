"use client"

import { useState, useEffect, useCallback } from "react"
import { PasswordGate } from "@/components/password-gate"
import { ProjectSelector } from "@/components/studio/project-selector"
import { RefImagesPanel } from "@/components/studio/ref-images-panel"
import { GeneratePanel, type BatchJob } from "@/components/studio/generate-panel"
import { Gallery } from "@/components/studio/gallery"
import { Lightbox } from "@/components/studio/lightbox"
import { StatsPanel } from "@/components/studio/stats-panel"
import { NotesPanel } from "@/components/studio/notes-panel"

interface Project {
  id: string
  name: string
  description: string | null
  notes?: string | null
  created_at: string
}

interface RefImage {
  id: string
  project_id: string
  storage_path: string
  public_url: string
  file_name: string
  created_at: string
}

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

interface EditChain {
  sourceImageUrl: string
  aspectRatio: string
  history: string[]
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [refImages, setRefImages] = useState<RefImage[]>([])
  const [refUploading, setRefUploading] = useState(false)

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [generating, setGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"view" | "select">("view")
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editChains, setEditChains] = useState<Map<string, EditChain>>(new Map())
  const [statsOpen, setStatsOpen] = useState(false)

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (e) {
      console.error("프로젝트 로드 실패:", e)
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  const loadRefImages = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/ref-images?projectId=${projectId}`)
      if (res.ok) {
        setRefImages(await res.json())
      }
    } catch (e) {
      console.error("참조 이미지 로드 실패:", e)
    }
  }, [])

  const loadGeneratedImages = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/generated-images?projectId=${projectId}`)
      if (res.ok) {
        setGeneratedImages(await res.json())
      }
    } catch (e) {
      console.error("생성 이미지 로드 실패:", e)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (selectedProject) {
      loadRefImages(selectedProject.id)
      loadGeneratedImages(selectedProject.id)
      setSelectedIds(new Set())
      setViewMode("view")
    } else {
      setRefImages([])
      setGeneratedImages([])
    }
  }, [selectedProject, loadRefImages, loadGeneratedImages])

  const handleCreateProject = async (name: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const newProject = await res.json()
        setProjects((prev) => [newProject, ...prev])
        setSelectedProject(newProject)
      }
    } catch (e) {
      console.error("프로젝트 생성 실패:", e)
    }
  }

  const handleSaveNotes = useCallback(
    async (notes: string): Promise<boolean> => {
      if (!selectedProject) return false
      try {
        const res = await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedProject.id, notes }),
        })
        if (!res.ok) return false
        const updated = await res.json()
        setProjects((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...p, notes: updated.notes } : p)),
        )
        setSelectedProject((prev) =>
          prev && prev.id === updated.id ? { ...prev, notes: updated.notes } : prev,
        )
        return true
      } catch (e) {
        console.error("메모 저장 실패:", e)
        return false
      }
    },
    [selectedProject],
  )

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id))
        if (selectedProject?.id === id) {
          setSelectedProject(null)
        }
      }
    } catch (e) {
      console.error("프로젝트 삭제 실패:", e)
    }
  }

  const compressImage = (file: File, maxSize = 1200): Promise<{ base64: string; contentType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let w = img.width
          let h = img.height

          if (w > maxSize || h > maxSize) {
            if (w > h) {
              h = Math.round((h * maxSize) / w)
              w = maxSize
            } else {
              w = Math.round((w * maxSize) / h)
              h = maxSize
            }
          }

          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(img, 0, 0, w, h)

          const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
          const base64 = dataUrl.split(",")[1]
          resolve({ base64, contentType: "image/jpeg" })
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUploadRef = async (file: File) => {
    if (!selectedProject) return
    setRefUploading(true)
    try {
      const { base64, contentType } = await compressImage(file)

      const res = await fetch("/api/ref-images/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          fileName: file.name,
          base64,
          contentType,
        }),
      })

      if (res.ok) {
        const newRef = await res.json()
        setRefImages((prev) => [...prev, newRef])
      } else {
        const err = await res.json()
        alert(err.error || "업로드 실패")
      }
    } catch (e) {
      console.error("참조 이미지 업로드 실패:", e)
    } finally {
      setRefUploading(false)
    }
  }

  const handleDeleteRef = async (id: string) => {
    try {
      const res = await fetch("/api/ref-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setRefImages((prev) => prev.filter((r) => r.id !== id))
      }
    } catch (e) {
      console.error("참조 이미지 삭제 실패:", e)
    }
  }

  const generateOne = async (
    prompt: string,
    aspectRatio: string,
    useRefs: boolean,
    imageSize: string = "1K",
  ): Promise<GeneratedImage | null> => {
    if (!selectedProject) return null
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          prompt,
          aspectRatio,
          imageSize,
          useRefImages: useRefs,
        }),
      })
      if (res.ok) {
        return await res.json()
      } else {
        const err = await res.json().catch(() => ({}))
        console.error("생성 실패:", err)
        return null
      }
    } catch (e) {
      console.error("생성 오류:", e)
      return null
    }
  }

  const handleGenerateBatch = async (
    jobs: BatchJob[],
    aspectRatio: string,
    imageSize: string,
  ) => {
    if (!selectedProject || jobs.length === 0) return
    const total = jobs.reduce((s, j) => s + j.count, 0)
    setGenerating(true)
    setBatchProgress({ done: 0, total })

    let done = 0
    let failed = 0
    try {
      for (const job of jobs) {
        for (let i = 0; i < job.count; i++) {
          const newImage = await generateOne(
            job.prompt,
            aspectRatio,
            job.useRefs,
            imageSize,
          )
          if (newImage) {
            setGeneratedImages((prev) => [newImage, ...prev])
          } else {
            failed++
          }
          done++
          setBatchProgress({ done, total })
        }
      }
      if (failed > 0) {
        alert(`총 ${total}장 중 ${failed}장 생성에 실패했습니다`)
      }
    } finally {
      setGenerating(false)
      setBatchProgress(null)
    }
  }

  const handleRegenerate = async (image: GeneratedImage) => {
    setLightboxImage(null)

    try {
      await fetch("/api/generated-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: [image.id] }),
      })
      setGeneratedImages((prev) => prev.filter((img) => img.id !== image.id))
    } catch (e) {
      console.error("삭제 실패:", e)
    }

    setGenerating(true)
    setBatchProgress({ done: 0, total: 1 })
    try {
      const newImage = await generateOne(
        image.prompt_text,
        image.aspect_ratio || "1:1",
        true,
        image.resolution || "1K",
      )
      if (newImage) {
        setGeneratedImages((prev) => [newImage, ...prev])
      }
      setBatchProgress({ done: 1, total: 1 })
    } finally {
      setGenerating(false)
      setBatchProgress(null)
    }
  }

  const handleEditImage = async (image: GeneratedImage, editPrompt: string, prevImageUrl?: string) => {
    if (!selectedProject) return
    setLightboxImage(null)
    setEditing(true)
    try {
      const existingChain = editChains.get(image.id)
      const editHistory = existingChain ? [...existingChain.history] : []

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          prompt: editPrompt,
          aspectRatio: image.aspect_ratio || "1:1",
          editImageUrl: image.public_url,
          editHistory: editHistory.length > 0 ? editHistory : undefined,
          prevImageUrl,
        }),
      })

      if (res.ok) {
        const newImage = await res.json()
        setGeneratedImages((prev) => [newImage, ...prev])

        // 수정 체인 이어가기: 항상 최신 이미지 URL을 source로 사용
        setEditChains((prev) => {
          const next = new Map(prev)
          next.set(newImage.id, {
            sourceImageUrl: newImage.public_url,
            aspectRatio: image.aspect_ratio || "1:1",
            history: [...editHistory, editPrompt],
          })
          return next
        })
      } else {
        const err = await res.json()
        alert(err.error || "이미지 수정 실패")
      }
    } catch (e) {
      console.error("이미지 수정 실패:", e)
      alert("이미지 수정 중 오류가 발생했습니다")
    } finally {
      setEditing(false)
    }
  }

  const handleAddToRefs = async (image: GeneratedImage): Promise<boolean> => {
    if (!selectedProject) return false
    if (refImages.length >= 14) {
      alert("참조 이미지는 최대 14장까지 가능합니다")
      return false
    }
    try {
      const res = await fetch("/api/ref-images/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          imageUrl: image.public_url,
        }),
      })
      if (res.ok) {
        const newRef = await res.json()
        setRefImages((prev) => [...prev, newRef])
        return true
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "참조 추가 실패")
        return false
      }
    } catch (e) {
      console.error("참조 추가 실패:", e)
      alert("참조 추가 중 오류가 발생했습니다")
      return false
    }
  }

  const handleDeleteImage = async (image: GeneratedImage) => {
    setLightboxImage(null)
    try {
      const res = await fetch("/api/generated-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: [image.id] }),
      })
      if (res.ok) {
        setGeneratedImages((prev) => prev.filter((img) => img.id !== image.id))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(image.id)
          return next
        })
      }
    } catch (e) {
      console.error("이미지 삭제 실패:", e)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}개 이미지를 삭제하시겠습니까?`)) return

    try {
      const res = await fetch("/api/generated-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setGeneratedImages((prev) => prev.filter((img) => !selectedIds.has(img.id)))
        setSelectedIds(new Set())
      }
    } catch (e) {
      console.error("선택 삭제 실패:", e)
    }
  }

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return
    setDownloading(true)

    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      const selected = generatedImages.filter((img) => selectedIds.has(img.id))

      for (let i = 0; i < selected.length; i++) {
        const img = selected[i]
        const response = await fetch(img.public_url)
        const blob = await response.blob()
        zip.file(`${i + 1}.png`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `studio-images-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (confirm("다운로드한 이미지를 삭제하시겠습니까?")) {
        await fetch("/api/generated-images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageIds: Array.from(selectedIds) }),
        })
        setGeneratedImages((prev) => prev.filter((img) => !selectedIds.has(img.id)))
        setSelectedIds(new Set())
      } else {
        setSelectedIds(new Set())
      }
    } catch (e) {
      console.error("다운로드 실패:", e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PasswordGate>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header */}
        <header className="border-b border-white/5 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-lg">🎨</span>
              </div>
              <h1 className="text-lg font-semibold">AutoBee Studio</h1>
            </div>
            <div className="flex items-center gap-3">
              {selectedProject && (
                <span className="text-sm text-white/40">{selectedProject.name}</span>
              )}
              {selectedProject && (
                <button
                  onClick={() => setStatsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                  통계
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto flex gap-6 p-6">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 space-y-6">
            <ProjectSelector
              projects={projects}
              selectedProject={selectedProject}
              onSelect={setSelectedProject}
              onCreate={handleCreateProject}
              onDelete={handleDeleteProject}
              loading={projectsLoading}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">
            {!selectedProject ? (
              <div className="flex items-center justify-center py-32 text-sm text-white/20">
                좌측에서 프로젝트를 선택하거나 생성해주세요
              </div>
            ) : (
              <>
                <RefImagesPanel
                  refImages={refImages}
                  onUpload={handleUploadRef}
                  onDelete={handleDeleteRef}
                  onDropGeneratedImage={async (imageId) => {
                    const img = generatedImages.find((g) => g.id === imageId)
                    if (img) {
                      await handleAddToRefs(img)
                    }
                  }}
                  uploading={refUploading}
                  disabled={!selectedProject}
                />

                <div className="border-t border-white/5" />

                <GeneratePanel
                  onGenerateBatch={handleGenerateBatch}
                  generating={generating}
                  disabled={!selectedProject}
                  refImageCount={refImages.length}
                  progress={batchProgress}
                />

                {editing && (
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 animate-pulse">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm text-white/60">이미지 수정 중...</span>
                  </div>
                )}

                <div className="border-t border-white/5" />

                <Gallery
                  images={generatedImages}
                  selectedIds={selectedIds}
                  onToggleSelect={(id) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }}
                  onSelectAll={() =>
                    setSelectedIds(new Set(generatedImages.map((img) => img.id)))
                  }
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onImageClick={setLightboxImage}
                  onDownload={handleDownloadSelected}
                  onDeleteSelected={handleDeleteSelected}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  downloading={downloading}
                />
              </>
            )}
          </main>
        </div>

        <Lightbox
          image={lightboxImage}
          images={generatedImages}
          onClose={() => setLightboxImage(null)}
          onNavigate={setLightboxImage}
          onRegenerate={handleRegenerate}
          onDelete={handleDeleteImage}
          onEdit={handleEditImage}
          onAddToRefs={handleAddToRefs}
          editHistory={lightboxImage ? (editChains.get(lightboxImage.id)?.history || []) : []}
        />

        <StatsPanel
          projectId={selectedProject?.id || null}
          projectName={selectedProject?.name}
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
        />

        {selectedProject && (
          <NotesPanel
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            initialNotes={selectedProject.notes || ""}
            onSave={handleSaveNotes}
          />
        )}
      </div>
    </PasswordGate>
  )
}
