import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const projectId = request.nextUrl.searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId 필요" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("studio_ref_images")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const formData = await request.formData()
    const projectId = formData.get("projectId") as string
    const file = formData.get("file") as File

    if (!projectId || !file) {
      return NextResponse.json({ error: "projectId와 file이 필요합니다" }, { status: 400 })
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

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const ext = file.name.split(".").pop() || "png"
    const storagePath = `${projectId}/${timestamp}-${randomId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("studio-refs")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/png",
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
        file_name: file.name,
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "id 필요" }, { status: 400 })
    }

    const { data: image } = await supabase
      .from("studio_ref_images")
      .select("storage_path")
      .eq("id", id)
      .single()

    if (image) {
      await supabase.storage.from("studio-refs").remove([image.storage_path])
    }

    const { error } = await supabase
      .from("studio_ref_images")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
