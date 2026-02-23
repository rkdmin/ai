/**
 * Layer 2 — Canvas 기반 이미지 유효성 검사
 * 실제 API 호출 없이 브라우저에서 처리 (완전 무료)
 */

const SAMPLE_SIZE = 100 // 성능을 위해 100x100으로 다운샘플링
const MIN_RESOLUTION = 80 // 최소 80px
const DARK_THRESHOLD = 40 // 평균 밝기 0~255 중 40 미만 → 너무 어두움
const BRIGHT_THRESHOLD = 230 // 230 초과 → 과노출
const UNIFORM_THRESHOLD = 15 // 표준편차 15 미만 → 단색·빈 화면

export function validateImage(base64) {
  return new Promise((resolve) => {
    const img = new Image()

    img.onerror = () =>
      resolve({ valid: false, reason: '이미지를 읽을 수 없어요. 다른 사진을 시도해주세요.' })

    img.onload = () => {
      // 해상도 체크
      if (img.width < MIN_RESOLUTION || img.height < MIN_RESOLUTION) {
        resolve({ valid: false, reason: '사진 해상도가 너무 낮아요. 더 선명한 사진을 올려주세요.' })
        return
      }

      // Canvas에 100×100으로 그려서 픽셀 분석
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE_SIZE
      canvas.height = SAMPLE_SIZE
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
      const pixelCount = SAMPLE_SIZE * SAMPLE_SIZE

      // 평균 밝기 계산 (Luma 공식)
      let totalBrightness = 0
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      }
      const avgBrightness = totalBrightness / pixelCount

      // 표준편차 계산 (픽셀 다양성 → 형체 있는지 판단)
      let variance = 0
      for (let i = 0; i < data.length; i += 4) {
        const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        variance += (luma - avgBrightness) ** 2
      }
      const stdDev = Math.sqrt(variance / pixelCount)

      if (avgBrightness < DARK_THRESHOLD) {
        resolve({ valid: false, reason: '사진이 너무 어두워요. 밝은 환경에서 찍은 사진을 올려주세요.' })
      } else if (avgBrightness > BRIGHT_THRESHOLD) {
        resolve({ valid: false, reason: '사진이 너무 밝아요. 과노출 없이 찍은 사진을 올려주세요.' })
      } else if (stdDev < UNIFORM_THRESHOLD) {
        resolve({ valid: false, reason: '사진에 형체가 없어요. 얼굴이 잘 보이는 사진을 올려주세요.' })
      } else {
        resolve({ valid: true })
      }
    }

    img.src = base64
  })
}
