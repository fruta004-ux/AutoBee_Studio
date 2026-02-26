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
    const {
      projectId,
      prompt,
      aspectRatio = "1:1",
      editImageUrl,
      editHistory,
      prevImageUrl,
    } = body

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

    const parts: any[] = []

    // 직전 컷 참고
    if (prevImageUrl) {
      try {
        parts.push(await fetchImageAsInlineData(prevImageUrl))
      } catch (e) {
        console.error("[studio] Failed to fetch prev image", e)
      }
    }

    // 수정 모드: 수정 대상 이미지
    if (editImageUrl) {
      try {
        parts.push(await fetchImageAsInlineData(editImageUrl))
      } catch (e) {
        console.error("[studio] Failed to fetch edit source image", e)
      }
    }

    // 참조 이미지 추가
    if (refImages && refImages.length > 0) {
      for (const ref of refImages) {
        try {
          parts.push(await fetchImageAsInlineData(ref.public_url))
        } catch (e) {
          console.error(`[studio] Failed to fetch ref image: ${ref.file_name}`, e)
        }
      }
    }

    // 수정 모드일 때 프롬프트에 수정 히스토리 컨텍스트 포함
    let fullPrompt = prompt
    if (editImageUrl && editHistory && editHistory.length > 0) {
      const historyContext = editHistory
        .map((h: string, i: number) => `수정 ${i + 1}: ${h}`)
        .join("\n")
      fullPrompt = `이전 수정 이력:\n${historyContext}\n\n새 수정 요청: ${prompt}\n\n${prevImageUrl ? "첫 번째 이미지는 직전 컷(참고용)이고, 두 번째 이미지를" : "위 이미지를"} 수정해주세요.`
    } else if (editImageUrl) {
      fullPrompt = `${prompt}\n\n${prevImageUrl ? "첫 번째 이미지는 직전 컷(참고용)이고, 두 번째 이미지를" : "위 이미지를"} 이 지시에 따라 수정해주세요.`
    }

    parts.push({ text: fullPrompt })

    const isEdit = !!editImageUrl
    console.log(
      `[studio] ${isEdit ? "Editing" : "Generating"}: ${refImages?.length || 0} refs, ratio=${aspectRatio}${editHistory ? `, history=${editHistory.length}` : ""}`,
    )

    const result = await retryWithBackoff(async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
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
