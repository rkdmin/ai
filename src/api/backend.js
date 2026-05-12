/**
 * 백엔드 HTTP 클라이언트.
 * Phase 2: 모든 AI 호출은 이 모듈을 통해 우리 FastAPI 서버로 간다.
 *
 * 환경변수 VITE_API_URL — 로컬 'http://localhost:8000', 개발 Render, 운영 Railway
 */

import { getAccessToken } from '../utils/authBridge'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

function getUserId() {
  // Phase 3 에서 Supabase 세션에서 채움.
  // 그 전까지: dev 모드에서는 localStorage 에 stable 가짜 id 발급해서 photo 합성 같은
  // require_user 라우트도 동작하게 한다. 운영 빌드(prod)에서는 항상 null → 게스트.
  if (typeof window === 'undefined') return null
  if (!import.meta.env.DEV) return null
  try {
    let id = window.localStorage.getItem('beaumi.dev_user_id')
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2, 10)
      window.localStorage.setItem('beaumi.dev_user_id', id)
    }
    return id
  } catch {
    return null
  }
}

function responseError(detail, status) {
  const err = new Error(detail)
  err.status = status
  return err
}

function authHeaders(base = {}) {
  const headers = { ...base }
  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else {
    const userId = getUserId()
    if (userId) headers['X-User-Id'] = userId
  }
  return headers
}

async function parseError(resp) {
  let detail = `요청 실패 (${resp.status})`
  try {
    const j = await resp.json()
    detail = j.detail || j.error || detail
  } catch { /* non-JSON */ }
  return responseError(detail, resp.status)
}

async function http(path, body) {
  let resp
  try {
    resp = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(`서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요. (${e.message})`)
  }

  if (!resp.ok) throw await parseError(resp)
  return resp.json()
}

async function httpGet(path) {
  let resp
  try {
    resp = await fetch(`${API_URL}${path}`, { headers: authHeaders() })
  } catch (e) {
    throw new Error(`서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요. (${e.message})`)
  }
  if (!resp.ok) throw await parseError(resp)
  return resp.json()
}

// ─── 얼굴 분석 ─────────────────────────────────────────────────────
export async function analyzeFace(imageBase64, personalColor = null) {
  return http('/api/analyze', { frontImage: imageBase64, personalColor })
}

// ─── 카드 생성 ────────────────────────────────────────────────────
function toCardsBody(analysis) {
  return {
    analysisId: analysis.analysisId ?? null,
    faceType: analysis.faceType,
    personalColor: analysis.personalColor ?? null,
    features: analysis.features ?? [],
  }
}

export async function generateHairCards(analysis) {
  return http('/api/cards/hair', toCardsBody(analysis))
}

export async function generateMakeupCards(analysis) {
  return http('/api/cards/makeup', toCardsBody(analysis))
}

export async function generateTotalCards(analysis) {
  return http('/api/cards/total', toCardsBody(analysis))
}

export async function generateAllCards(analysis) {
  const [hair, makeup, total] = await Promise.all([
    generateHairCards(analysis),
    generateMakeupCards(analysis),
    generateTotalCards(analysis),
  ])
  return { hair, makeup, total }
}

// ─── 스타일 적용 사진 생성 ────────────────────────────────────────
// 메이크업 카드는 사진 생성 미지원 — 호출자가 cardType !== 'makeup' 으로 가드.
export async function generateStyledPhoto(imageBase64, card) {
  const result = await http('/api/photo/generate', {
    analysisId: card.analysisId ?? null,
    cardType: card.cardType,
    card,
    frontImage: imageBase64,
  })
  return result.generatedImage
}

export async function fetchHistory(limit = 5) {
  return httpGet(`/api/history?limit=${encodeURIComponent(limit)}`)
}

export async function fetchHistoryDetail(analysisId) {
  return httpGet(`/api/history/${encodeURIComponent(analysisId)}`)
}

export async function saveHistoryCard(analysisId, cardType, cardData) {
  return http('/api/history', { analysisId, cardType, cardData })
}
