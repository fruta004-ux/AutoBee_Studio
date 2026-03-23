"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Calendar, RefreshCw, ChevronLeft, ChevronRight, BarChart3, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DailyRow {
  date: string
  success: number
  fail: number
  total: number
}

interface MonthlyRow {
  month: string
  success: number
  fail: number
  total: number
}

interface Stats {
  daily: DailyRow[]
  monthly: MonthlyRow[]
  grandTotal: number
}

interface StatsPanelProps {
  projectId: string | null
  projectName?: string
  open: boolean
  onClose: () => void
}

export function StatsPanel({ projectId, projectName, open, onClose }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        if (!selectedMonth && data.monthly.length > 0) {
          setSelectedMonth(data.monthly[0].month)
        }
      }
    } catch (error) {
      console.error("통계 불러오기 실패:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      loadStats()
      setSelectedMonth(null)
    }
  }, [open, projectId, loadStats])

  if (!open) return null

  const filteredDaily = stats?.daily.filter((d) =>
    selectedMonth ? d.date.startsWith(selectedMonth) : true
  ) || []

  const selectedMonthData = stats?.monthly.find((m) => m.month === selectedMonth)

  const navigateMonth = (direction: -1 | 1) => {
    if (!stats || !selectedMonth) return
    const months = stats.monthly.map((m) => m.month)
    const currentIndex = months.indexOf(selectedMonth)
    const nextIndex = currentIndex - direction
    if (nextIndex >= 0 && nextIndex < months.length) {
      setSelectedMonth(months[nextIndex])
    }
  }

  const canGoNext = (() => {
    if (!stats || !selectedMonth) return false
    const months = stats.monthly.map((m) => m.month)
    return months.indexOf(selectedMonth) > 0
  })()

  const canGoPrev = (() => {
    if (!stats || !selectedMonth) return false
    const months = stats.monthly.map((m) => m.month)
    return months.indexOf(selectedMonth) < months.length - 1
  })()

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-")
    return `${year}년 ${parseInt(m)}월`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-white/50" />
            <h2 className="text-sm font-medium">
              생성 통계
              {projectName && <span className="text-white/40 ml-2">— {projectName}</span>}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white/40" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            </div>
          ) : !stats ? (
            <div className="text-center py-20 text-sm text-white/30">
              통계 데이터를 불러올 수 없습니다
            </div>
          ) : (
            <>
              {/* 상단 요약 카드 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 mb-1">전체 생성</p>
                  <p className="text-2xl font-semibold">{stats.grandTotal}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 mb-1">성공</p>
                  <p className="text-2xl font-semibold text-green-400">
                    {stats.daily.reduce((sum, d) => sum + d.success, 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 mb-1">실패</p>
                  <p className="text-2xl font-semibold text-red-400">
                    {stats.daily.reduce((sum, d) => sum + d.fail, 0)}
                  </p>
                </div>
              </div>

              {/* 월 선택기 */}
              {stats.monthly.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateMonth(-1)}
                      disabled={!canGoPrev}
                      className="w-8 h-8 rounded flex items-center justify-center text-white/50 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-base font-medium min-w-[120px] text-center">
                      {selectedMonth ? formatMonth(selectedMonth) : "전체"}
                    </span>

                    <button
                      onClick={() => navigateMonth(1)}
                      disabled={!canGoNext}
                      className="w-8 h-8 rounded flex items-center justify-center text-white/50 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedMonth && (
                    <button
                      onClick={() => setSelectedMonth(null)}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      전체 보기
                    </button>
                  )}
                </div>
              )}

              {/* 월간 합계 (전체 보기) */}
              {!selectedMonth && stats.monthly.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <h3 className="text-sm font-medium text-white/70">월간 합계</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-white/40 font-normal">월</th>
                        <th className="text-right py-3 px-4 text-white/40 font-normal">성공</th>
                        <th className="text-right py-3 px-4 text-white/40 font-normal">실패</th>
                        <th className="text-right py-3 px-4 text-white/40 font-normal">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.monthly.map((row) => (
                        <tr
                          key={row.month}
                          onClick={() => setSelectedMonth(row.month)}
                          className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 text-white/70">{formatMonth(row.month)}</td>
                          <td className="py-3 px-4 text-right text-green-400">{row.success}</td>
                          <td className="py-3 px-4 text-right text-red-400/70">{row.fail > 0 ? row.fail : "-"}</td>
                          <td className="py-3 px-4 text-right text-white font-medium">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10">
                        <td className="py-3 px-4 text-white/50 font-medium">전체</td>
                        <td className="py-3 px-4 text-right text-green-400 font-medium">
                          {stats.monthly.reduce((s, r) => s + r.success, 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-400/70 font-medium">
                          {stats.monthly.reduce((s, r) => s + r.fail, 0) || "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-bold">{stats.grandTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* 선택된 월 요약 */}
              {selectedMonth && selectedMonthData && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-white/40 mb-1">성공</p>
                    <p className="text-xl font-semibold text-green-400">{selectedMonthData.success}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-white/40 mb-1">실패</p>
                    <p className="text-xl font-semibold text-red-400">{selectedMonthData.fail}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-white/40 mb-1">합계</p>
                    <p className="text-xl font-semibold">{selectedMonthData.total}</p>
                  </div>
                </div>
              )}

              {/* 날짜별 상세 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <h3 className="text-sm font-medium text-white/70">
                    {selectedMonth ? `${formatMonth(selectedMonth)} 상세` : "날짜별 상세"}
                  </h3>
                </div>
                {filteredDaily.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-zinc-900">
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-white/40 font-normal">날짜</th>
                          <th className="text-right py-3 px-4 text-white/40 font-normal">성공</th>
                          <th className="text-right py-3 px-4 text-white/40 font-normal">실패</th>
                          <th className="text-right py-3 px-4 text-white/40 font-normal">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDaily.map((row) => (
                          <tr key={row.date} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 px-4 text-white/70">{row.date}</td>
                            <td className="py-3 px-4 text-right text-green-400">{row.success}</td>
                            <td className="py-3 px-4 text-right text-red-400/70">{row.fail > 0 ? row.fail : "-"}</td>
                            <td className="py-3 px-4 text-right text-white font-medium">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                      {filteredDaily.length > 1 && (
                        <tfoot>
                          <tr className="border-t border-white/10">
                            <td className="py-3 px-4 text-white/50 font-medium">소계</td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">
                              {filteredDaily.reduce((s, r) => s + r.success, 0)}
                            </td>
                            <td className="py-3 px-4 text-right text-red-400/70 font-medium">
                              {filteredDaily.reduce((s, r) => s + r.fail, 0) || "-"}
                            </td>
                            <td className="py-3 px-4 text-right text-white font-bold">
                              {filteredDaily.reduce((s, r) => s + r.total, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-white/20 py-4">해당 기간에 데이터가 없습니다</p>
                )}
              </div>

              {/* 월 바로가기 */}
              {stats.monthly.length > 1 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs transition-all",
                      !selectedMonth
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                    )}
                  >
                    전체
                  </button>
                  {stats.monthly.map((row) => (
                    <button
                      key={row.month}
                      onClick={() => setSelectedMonth(row.month)}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs transition-all",
                        selectedMonth === row.month
                          ? "bg-white text-black"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      )}
                    >
                      {parseInt(row.month.split("-")[1])}월
                      <span className="ml-1 text-[10px] opacity-60">({row.total})</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
