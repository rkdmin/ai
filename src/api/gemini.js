const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash-preview-image-generation'

function buildStylePrompt(card) {
  return `이 사람의 사진을 아래 스타일로 변경해주세요.

헤어스타일: ${card.hair}
립 컬러: ${card.makeup.lip}
블러셔: ${card.makeup.blush}
아이섀도우: ${card.makeup.eyeshadow}

규칙:
- 얼굴 형태, 피부톤, 이목구비는 원본과 동일하게 유지
- 헤어스타일과 메이크업만 자연스럽게 변경
- 실제 사람처럼 현실적으로 표현`
}

export async function generateStyledPhoto(imageBase64, card) {
  const base64Data = imageBase64.split(',')[1]
  const mimeType = imageBase64.split(';')[0].split(':')[1]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: buildStylePrompt(card) },
          ],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API 오류 (${response.status})`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(p => p.inlineData)

  if (!imagePart) throw new Error('이미지를 생성할 수 없습니다.')

  const { mimeType: outMime, data: outData } = imagePart.inlineData
  return `data:${outMime};base64,${outData}`
}
