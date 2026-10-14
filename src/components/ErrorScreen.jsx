// TODO: 실제 에러를 backend.js 의 catch 블록에서 type 별로 분기해 띄우기.
//   - face: 얼굴 미검출 (analyze 응답이 faceType:'판정 어려움' 이거나 422 반환)
//   - network: fetch 실패 / timeout
// 현재는 유사 데모 화면으로만 동작 (실제 라우팅 진입점 미연결).
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';

const FACE_TIPS = [
  { n: '01', label: '정면 사진인지 확인' },
  { n: '02', label: '얼굴이 가려지지 않았는지' },
  { n: '03', label: '조명이 너무 어둡지 않은지' },
  { n: '04', label: '필터 / 보정이 과하지 않은지' },
];

const NETWORK_TIPS = [
  { n: '01', label: '와이파이 또는 LTE 연결' },
  { n: '02', label: '기내 모드 해제 확인' },
  { n: '03', label: '잠시 후 다시 시도' },
];

const CODE_COPY = {
  INVALID_IMAGE: { eyebrow: 'ERROR · INVALID IMAGE', title: <>사진 파일을<br />읽지 못했어요</> },
  NO_FACE: { eyebrow: 'ERROR · FACE NOT FOUND', title: <>사진에서 얼굴을<br />찾지 못했어요</> },
  MULTIPLE_FACES: { eyebrow: 'ERROR · MULTIPLE FACES', title: <>한 명의 얼굴만<br />선택해 주세요</> },
  FACE_TOO_SMALL: { eyebrow: 'ERROR · FACE TOO SMALL', title: <>얼굴이 더 크게 보이는<br />사진을 선택해 주세요</> },
  UNSUPPORTED_PHOTO: { eyebrow: 'ERROR · PHOTO', title: <>다른 정면 사진으로<br />다시 시도해 주세요</> },
  RATE_LIMITED: { eyebrow: 'ERROR · LIMIT', title: <>오늘 사용량을<br />모두 사용했어요</> },
  AI_UNAVAILABLE: { eyebrow: 'ERROR · SERVER', title: <>분석 서버가 잠시<br />바빠요</> },
  AI_ERROR: { eyebrow: 'ERROR · SERVER', title: <>분석을 마치지<br />못했어요</> },
};

export default function ErrorScreen({ type = 'face', code = null, message, onRetry, onBack }) {
  const isFace = type === 'face';
  const tips = isFace ? FACE_TIPS : NETWORK_TIPS;
  const codeCopy = CODE_COPY[code];
  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 14px 6px', flexShrink: 0, minHeight: 52 }}>
        <button onClick={onBack} className="icon-btn" style={{ marginRight: -6 }} aria-label="close">
          {Icons.close(20)}
        </button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ padding: '48px 28px 0' }}>
        <div
          style={{ width: 60, height: 60, border: '1.2px solid #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
        >
          {isFace ? Icons.warn(24) : Icons.wifiOff(24)}
        </div>
        <div className="label" style={{ marginBottom: 8, color: '#7a7a7a' }}>
          {codeCopy?.eyebrow || (isFace ? 'ERROR · FACE NOT FOUND' : 'ERROR · NETWORK')}
        </div>
        <h1 className="ko" style={{ margin: 0, fontSize: 24, fontWeight: 300, lineHeight: 1.3, letterSpacing: '-.01em' }}>
          {codeCopy?.title || (isFace ? <>사진에서 얼굴을<br />찾지 못했어요</> : <>연결이 잠시<br />불안정해요</>)}
        </h1>
        <p className="ko" style={{ margin: '16px 0 26px', fontSize: 13, lineHeight: 1.7, color: '#5a5a5a', fontWeight: 300 }}>
          {isFace
            ? '아래 항목을 확인하고 다시 시도해 주세요. 얼굴이 잘 보이는 정면 사진이 가장 정확해요.'
            : '와이파이 또는 데이터 연결을 확인하고 다시 시도해 주세요. 분석은 처음부터 시작되지 않아요.'}
        </p>
        {message && (
          <div
            style={{
              padding: '10px 12px', background: '#f6f1ed', borderLeft: '2px solid #c45a3b',
              fontSize: 11.5, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.6, marginBottom: 18,
              wordBreak: 'break-word',
            }}
          >
            <span className="label" style={{ fontSize: 9, color: '#7a7a7a', marginRight: 6 }}>DETAIL</span>
            {message}
          </div>
        )}

        <div style={{ borderTop: '1px solid #000' }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #e8e8e8' }}>
              <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22 }}>{t.n}</span>
              <span className="ko" style={{ fontSize: 13, fontWeight: 300 }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '18px 24px max(env(safe-area-inset-bottom), 30px)', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.18em', cursor: 'pointer' }}
        >
          HOME
        </button>
        <button
          onClick={onRetry}
          style={{ flex: 2, background: '#000', color: '#fff', border: 'none', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}
        >
          {isFace ? 'NEW PHOTO →' : 'RETRY →'}
        </button>
      </div>
    </div>
  );
}
