import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { projectId, imageUrl } = await request.json()

    if (!projectId || !imageUrl) {
      return NextResponse.json(
        { error: "projectId와 imageUrl이 필요합니다" },
        { status: 400 },
      )
    }

    const { count } = await supabase
      .from("studio_ref_images")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)

    if ((count ?? 0) >= 14) {
      return NextResponse.json(
        { error: "참조 이미지는 최대 14장까지 가능합니다" },
        { status: 400 },
      )
    }

    const response = await fetch(imageUrl)
    if (!response.ok) {
      return NextResponse.json({ error: "이미지를 가져올 수 없습니다" }, { status: 400 })
    }
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get("content-type") || "image/png"
    const ext = contentType.split("/")[1] || "png"

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const storagePath = `${projectId}/${timestamp}-${randomId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("studio-refs")
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error("[studio] from-url upload error:", uploadError)
      return NextResponse.json({ error: "업로드 실패" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("studio-refs")
      .getPublicUrl(storagePath)

    const { data, error: dbError } = await supabase
      .from("studio_ref_images")
      .insert({
        project_id: projectId,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_name: `generated-${timestamp}.${ext}`,
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from("studio-refs").remove([storagePath])
      return NextResponse.json({ error: "DB 저장 실패" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
