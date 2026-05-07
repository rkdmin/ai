/**
 * 개발자용 프롬프트/응답 인스펙터 — 이벤트 버스 + 인메모리 스토리지
 *
 * VITE_DEV_INSPECTOR=true 일 때만 동작. 그 외에는 모든 함수가 no-op이고
 * 빌드 시 import.meta.env.VITE_DEV_INSPECTOR가 상수로 치환되어 데드코드 제거됨.
 *
 * 운영 빌드(`npm run build`)에서 VITE_DEV_INSPECTOR가 설정돼 있지 않으면
 * 본 파일의 분기 본문은 트리 셰이킹 대상이 된다.
 *
 * v1.0 출시 직전 src/devtools/ 디렉토리째 제거 가능.
 */

export const INSPECTOR_ENABLED = import.meta.env.VITE_DEV_INSPECTOR === 'true'

const MAX_RECORDS = 50

const records = []
const listeners = new Set()
let nextId = 1

function notify() {
  for (const listener of listeners) listener(records)
}

export function recordCall(entry) {
  if (!INSPECTOR_ENABLED) return null
  const record = {
    id: nextId++,
    timestamp: Date.now(),
    ...entry,
  }
  records.unshift(record)
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS
  notify()
  return record
}

export function subscribe(listener) {
  if (!INSPECTOR_ENABLED) return () => {}
  listeners.add(listener)
  listener(records)
  return () => listeners.delete(listener)
}

export function clearRecords() {
  if (!INSPECTOR_ENABLED) return
  records.length = 0
  notify()
}

export function getRecords() {
  return INSPECTOR_ENABLED ? records.slice() : []
}
