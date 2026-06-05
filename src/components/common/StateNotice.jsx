import { Icons } from './Icons';

const EYEBROW_COLOR = {
  loading: '#7a7a7a',
  empty: '#7a7a7a',
  error: '#c45a3b',
};

/**
 * 화면 공통 empty / error / loading 상태 블록.
 * 구조(선택적 아이콘 → 영문 eyebrow 라벨 → 한국어 본문)와 톤을 한 컴포넌트로 통일한다.
 *
 * 문구 톤 규칙 — 이 컴포넌트를 쓰는 모든 호출부가 따른다:
 *   - 친근한 '~어요/아요' 체
 *   - 보조용언은 띄어쓴다: '다시 시도해 주세요', '올려 주세요'
 *   - 로딩 본문은 진행 상태이므로 마침표를 붙이지 않는다: '불러오는 중이에요'
 *   - eyebrow 는 항상 .label (Jost 대문자). loading/empty 는 회색, error 는 경고색.
 *
 * @param {'loading'|'empty'|'error'} variant
 * @param {string} eyebrow   영문 라벨 (예: 'LOADING', 'NO CARDS YET', 'LOAD FAILED')
 * @param {React.ReactNode} message  한국어 본문 (문자열 또는 <br/> 포함 노드)
 * @param {boolean} icon     경고 아이콘 원형 표시 여부 (empty 강조용)
 * @param {object} style     컨테이너 style 오버라이드 (예: 목록 구분선)
 */
export function StateNotice({ variant = 'empty', eyebrow, message, icon = false, style }) {
  return (
    <div style={{ padding: '44px 22px', textAlign: 'center', ...style }}>
      {icon && (
        <div
          style={{
            width: 56, height: 56, border: '1px solid #000', borderRadius: '50%',
            margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {Icons.warn(22)}
        </div>
      )}
      {eyebrow && (
        <div className="label" style={{ marginBottom: 8, color: EYEBROW_COLOR[variant] || '#7a7a7a' }}>
          {eyebrow}
        </div>
      )}
      <div className="ko" style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.6, color: '#5a5a5a' }}>
        {message}
      </div>
    </div>
  );
}
