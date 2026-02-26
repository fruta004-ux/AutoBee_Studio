import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 2000,
): Promise<T> {
  let lastError: Error | unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      const shouldRetry =
        error?.status === 429 ||
        error?.status === 500 ||
        error?.status === 503 ||
        error?.message?.includes("429") ||
        error?.message?.includes("500") ||
        error?.message?.includes("503") ||
        error?.message?.includes("No image generated") ||
        error?.message?.includes("No image in response") ||
        error?.message?.includes("No candidate") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("overloaded") ||
        error?.message?.includes("timeout")

      if (shouldRetry && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000
        console.log(
          `[studio] Retry in ${Math.round(delay)}ms (attempt ${i + 1}/${maxRetries}): ${error?.message || error}`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }

  throw lastError
}

async function fetchImageAsInlineData(url: string) {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const contentType = response.headers.get("content-type") || "image/png"
  return { inlineData: { mimeType: contentType, data: base64 } }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { projectId, prompt, aspectRatio = "1:1", chatHistory } = body

    if (!projectId || !prompt?.trim()) {
      return NextResponse.json(
        { error: "projectId와 prompt가 필요합니다" },
        { status: 400 },
      )
    }

    // 참조 이미지 가져오기
    const { data: refImages } = await supabase
      .from("studio_ref_images")
      .select("public_url, file_name")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })

    // contents 구성
    let contents: any[] = []

    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      // 멀티턴: 이전 대화 히스토리를 그대로 사용
      // chatHistory 형식: [{ role, imageUrl?, text? }, ...]
      for (const turn of chatHistory) {
        const turnParts: any[] = []

        if (turn.imageUrl) {
          try {
            turnParts.push(await fetchImageAsInlineData(turn.imageUrl))
          } catch (e) {
            console.error("[studio] Failed to fetch history image", e)
          }
        }

        if (turn.text) {
          turnParts.push({ text: turn.text })
        }

        if (turnParts.length > 0) {
          contents.push({ role: turn.role, parts: turnParts })
        }
      }

      // 현재 사용자 메시지 추가
      const currentParts: any[] = []
      currentParts.push({ text: prompt })
      contents.push({ role: "user", parts: currentParts })
    } else {
      // 첫 생성: 참조 이미지 + 프롬프트
      const parts: any[] = []

      if (refImages && refImages.length > 0) {
        for (const ref of refImages) {
          try {
            parts.push(await fetchImageAsInlineData(ref.public_url))
          } catch (e) {
            console.error(`[studio] Failed to fetch ref image: ${ref.file_name}`, e)
          }
        }
      }

      parts.push({ text: prompt })
      contents = [{ role: "user", parts }]
    }

    console.log(
      `[studio] Generating: ${contents.length} turns, ${refImages?.length || 0} refs, ratio=${aspectRatio}`,
    )

    const result = await retryWithBackoff(async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio,
              },
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            ],
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const apiResult = await response.json()

      const candidate = apiResult.candidates?.[0]
      if (!candidate) throw new Error("No candidate in response")

      const responseParts = candidate.content?.parts || []
      const imagePart = responseParts.find(
        (p: any) => p.inlineData?.mimeType?.startsWith("image/"),
      )

      if (!imagePart) throw new Error("No image generated")

      return { imagePart, responseParts }
    })

    const { imagePart } = result
    const imageData = imagePart.inlineData.data
    const mimeType = imagePart.inlineData.mimeType
    const ext = mimeType.split("/")[1] || "png"

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const storagePath = `${projectId}/${timestamp}-${randomId}.${ext}`
    const buffer = Buffer.from(imageData, "base64")

    const { error: uploadError } = await supabase.storage
      .from("studio-images")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error("[studio] Upload error:", uploadError)
      await supabase.from("studio_generation_logs").insert({
        project_id: projectId,
        prompt_text: prompt,
        status: "fail",
      })
      return NextResponse.json({ error: "이미지 저장 실패" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("studio-images")
      .getPublicUrl(storagePath)

    const { data: dbData, error: dbError } = await supabase
      .from("studio_generated_images")
      .insert({
        project_id: projectId,
        prompt_text: prompt,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        aspect_ratio: aspectRatio,
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from("studio-images").remove([storagePath])
      await supabase.from("studio_generation_logs").insert({
        project_id: projectId,
        prompt_text: prompt,
        status: "fail",
      })
      return NextResponse.json({ error: "DB 저장 실패" }, { status: 500 })
    }

    await supabase.from("studio_generation_logs").insert({
      project_id: projectId,
      prompt_text: prompt,
      status: "success",
    })

    return NextResponse.json(dbData)
  } catch (error) {
    console.error("[studio] Generate error:", error)

    try {
      const supabase = getSupabase()
      const body = await request.clone().json()
      if (body.projectId) {
        await supabase.from("studio_generation_logs").insert({
          project_id: body.projectId,
          prompt_text: body.prompt || "",
          status: "fail",
        })
      }
    } catch {}

    return NextResponse.json(
      {
        error: "이미지 생성 실패",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
