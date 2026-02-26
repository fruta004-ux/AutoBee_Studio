import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { projectId, fileName, base64, contentType } = await request.json()

    if (!projectId || !base64) {
      return NextResponse.json({ error: "projectId와 이미지 데이터가 필요합니다" }, { status: 400 })
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

    const buffer = Buffer.from(base64, "base64")
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const ext = fileName?.split(".").pop() || "png"
    const storagePath = `${projectId}/${timestamp}-${randomId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("studio-refs")
      .upload(storagePath, buffer, {
        contentType: contentType || "image/png",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
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
        file_name: fileName || `${timestamp}.${ext}`,
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
