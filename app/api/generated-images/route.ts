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
      .from("studio_generated_images")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: "imageIds 필요" }, { status: 400 })
    }

    const { data: images } = await supabase
      .from("studio_generated_images")
      .select("id, storage_path")
      .in("id", imageIds)

    if (images && images.length > 0) {
      await supabase.storage
        .from("studio-images")
        .remove(images.map((img) => img.storage_path))
    }

    const { error } = await supabase
      .from("studio_generated_images")
      .delete()
      .in("id", imageIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCount: images?.length || 0 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
