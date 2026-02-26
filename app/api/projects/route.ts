import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("studio_projects")
      .select("*")
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

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "프로젝트 이름은 필수입니다" }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("studio_projects")
      .insert({ name: name.trim(), description: description?.trim() || null })
      .select()
      .single()

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
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "프로젝트 ID가 필요합니다" }, { status: 400 })
    }

    const supabase = getSupabase()

    // 연관된 참조 이미지 스토리지 파일 삭제
    const { data: refImages } = await supabase
      .from("studio_ref_images")
      .select("storage_path")
      .eq("project_id", id)

    if (refImages && refImages.length > 0) {
      await supabase.storage
        .from("studio-refs")
        .remove(refImages.map((r) => r.storage_path))
    }

    // 연관된 생성 이미지 스토리지 파일 삭제
    const { data: genImages } = await supabase
      .from("studio_generated_images")
      .select("storage_path")
      .eq("project_id", id)

    if (genImages && genImages.length > 0) {
      await supabase.storage
        .from("studio-images")
        .remove(genImages.map((g) => g.storage_path))
    }

    // CASCADE로 연관 데이터 자동 삭제
    const { error } = await supabase
      .from("studio_projects")
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
