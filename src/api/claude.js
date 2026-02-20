const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function analyzeFace(imageBase64) {
  const base64Data = imageBase64.split(',')[1]
  const mediaType = imageBase64.split(';')[0].split(':')[1]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `이 사람의 얼굴을 분석해주세요. 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 중 하나",
  "personalColor": "봄웜 | 여름쿨 | 가을웜 | 겨울쿨 중 하나",
  "colorConfidence": "high | medium | low 중 하나",
  "features": ["이목구비 특징을 한국어로 2~4개"]
}

얼굴형 기준:
- 계란형: 이마가 약간 넓고 턱으로 갈수록 좁아지는 형태
- 둥근형: 얼굴 폭과 길이가 비슷하고 윤곽이 부드러운 형태
- 사각형: 이마와 턱의 폭이 비슷하고 각진 형태
- 하트형: 이마가 넓고 턱이 뾰족한 형태
- 긴형: 얼굴 길이가 폭보다 확연히 긴 형태

퍼스널컬러 기준:
- 봄웜: 밝고 화사한 황금빛·복숭아빛 피부
- 여름쿨: 밝고 차가운 핑크빛·로즈빛 피부
- 가을웜: 깊고 따뜻한 황갈빛·베이지빛 피부
- 겨울쿨: 선명하고 차가운 블루빛·다크 피부

colorConfidence:
- high: 사진에서 확실하게 판단 가능
- medium: 어느 정도 판단 가능하나 확신하기 어려움
- low: 조명·사진 품질로 판단이 매우 어려움

features 예시: "눈 간격이 넓음", "코 높이가 낮음", "입술이 두꺼움", "턱선이 각짐"`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 오류 (${response.status})`)
  }

  const data = await response.json()
  const text = data.content[0].text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('분석 결과를 읽을 수 없습니다.')

  return JSON.parse(jsonMatch[0])
}
