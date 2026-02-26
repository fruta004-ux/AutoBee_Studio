import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId 필요" }, { status: 400 })
    }

    const { data: logs, error } = await supabase
      .from("studio_generation_logs")
      .select("created_at, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const daily: Record<string, { success: number; fail: number; total: number }> = {}
    const monthly: Record<string, { success: number; fail: number; total: number }> = {}

    for (const log of logs || []) {
      const date = log.created_at.substring(0, 10)
      const month = log.created_at.substring(0, 7)

      if (!daily[date]) daily[date] = { success: 0, fail: 0, total: 0 }
      if (!monthly[month]) monthly[month] = { success: 0, fail: 0, total: 0 }

      daily[date].total++
      monthly[month].total++

      if (log.status === "success") {
        daily[date].success++
        monthly[month].success++
      } else {
        daily[date].fail++
        monthly[month].fail++
      }
    }

    const dailyArr = Object.entries(daily)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date))

    const monthlyArr = Object.entries(monthly)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => b.month.localeCompare(a.month))

    return NextResponse.json({
      daily: dailyArr,
      monthly: monthlyArr,
      grandTotal: (logs || []).length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
