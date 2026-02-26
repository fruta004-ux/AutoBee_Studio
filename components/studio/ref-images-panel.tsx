"use client"

import { useRef } from "react"
import { Plus, X, ImageIcon, Loader2 } from "lucide-react"

interface RefImage {
  id: string
  project_id: string
  storage_path: string
  public_url: string
  file_name: string
  created_at: string
}

interface RefImagesPanelProps {
  refImages: RefImage[]
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
  uploading: boolean
  disabled: boolean
}

export function RefImagesPanel({
  refImages,
  onUpload,
  onDelete,
  uploading,
  disabled,
}: RefImagesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      await onUpload(files[i])
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/70">
            참조 이미지 ({refImages.length}/14)
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {refImages.map((img) => (
          <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden bg-white/5">
            <img
              src={img.public_url}
              alt={img.file_name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onDelete(img.id)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}

        {refImages.length < 14 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="w-20 h-20 rounded-lg border border-dashed border-white/15 flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/50 hover:border-white/30 transition-all disabled:opacity-30"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span className="text-[10px]">추가</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {refImages.length === 0 && (
        <p className="text-xs text-white/20">
          참조 이미지를 업로드하면 생성 시 함께 전송됩니다
        </p>
      )}
    </div>
  )
}
