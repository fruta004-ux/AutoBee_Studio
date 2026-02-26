"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || "studio2025"

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const authStatus = localStorage.getItem("studio_authenticated")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem("studio_authenticated", "true")
      setError("")
    } else {
      setError("비밀번호가 올바르지 않습니다.")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-white/40">로딩 중...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white mb-2">
              <span className="text-2xl">🎨</span>
            </div>
            <h1 className="text-xl font-semibold text-white">AutoBee Studio</h1>
            <p className="text-sm text-white/40">비밀번호를 입력하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/20"
            />
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-white/90">
              확인
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
