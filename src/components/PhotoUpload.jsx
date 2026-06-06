import { useRef, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

// 정면 사진 1장 업로드. → onUpload(file, dataUrl). NEXT 는 파일 + 동의 체크가 모두 충족돼야 진행.
//
// 사진 입력 경로 (플랫폼 분기):
//   - Capacitor 네이티브(앱): @capacitor/camera 로 OS 네이티브 카메라/갤러리 피커 호출 (Phase 6-2).
//   - 웹/브라우저: 기존 <input type=file> 폴백 (capture="user"=카메라 / 미지정=앨범).
// 두 경로 모두 결과를 { file, dataUrl } 로 normalize 해서 동일하게 처리한다.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — 백엔드 정책과 동기화 필요.

// Capacitor 네이티브(앱) 실행 여부. 네이티브 레이어가 window.Capacitor 를 주입한다.
// 브라우저에서는 undefined → false (웹 폴백 사용).
function isNativePlatform() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
}

export default function PhotoUpload({ onUpload, onBack }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [preview, setPreview] = useState(null); // { file, dataUrl }
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 네이티브(앱) 전용 — @capacitor/camera 로 OS 카메라/갤러리 피커. 동적 import 라 웹 번들엔 포함 안 됨.
  async function pickNative(useCamera) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1280,                 // 얼굴 분석엔 충분 + base64 payload 과대 방지 (백엔드 10MB 정책)
        resultType: CameraResultType.DataUrl,
        source: useCamera ? CameraSource.Camera : CameraSource.Photos,
        allowEditing: false,
        correctOrientation: true,    // EXIF 회전 보정 — 분석 정확도에 도움
      });
      const dataUrl = photo?.dataUrl;
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      if (blob.size > MAX_FILE_BYTES) {
        setErrorMsg('사진 용량은 10MB 이하만 업로드할 수 있어요.');
        return;
      }
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const file = new File([blob], `capture.${ext}`, { type: blob.type || 'image/jpeg' });
      setErrorMsg('');
      setPreview({ file, dataUrl });
    } catch (e) {
      // 사용자가 취소하면 예외가 나므로 조용히 무시한다.
      const msg = String(e?.message || '');
      if (/cancel/i.test(msg) || /No image/i.test(msg)) return;
      setErrorMsg('카메라를 열 수 없어요. 권한을 확인하고 다시 시도해 주세요.');
    }
  }

  function pickFromCamera() {
    if (isNativePlatform()) { pickNative(true); return; }
    cameraRef.current?.click();
  }
  function pickFromGallery() {
    if (isNativePlatform()) { pickNative(false); return; }
    galleryRef.current?.click();
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용.
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg('사진 용량은 10MB 이하만 업로드할 수 있어요.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일만 업로드할 수 있어요.');
      return;
    }
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => setPreview({ file, dataUrl: reader.result });
    reader.onerror = () => setErrorMsg('파일을 읽을 수 없어요. 다시 시도해 주세요.');
    reader.readAsDataURL(file);
  }
  // dev/mock 전용 — 번들된 샘플 얼굴(연예인 테스트 데이터)을 업로드한 것처럼 세팅.
  // 동적 import 라 운영 번들/실행 경로에는 포함되지 않는다.
  async function useSampleFace() {
    try {
      const { default: url } = await import('../assets/dev-sample-face.jpg');
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'dev-sample-face.jpg', { type: blob.type || 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = () => { setPreview({ file, dataUrl: reader.result }); setConsent(true); setErrorMsg(''); };
      reader.readAsDataURL(file);
    } catch {
      setErrorMsg('샘플 이미지를 불러오지 못했어요.');
    }
  }
  function next() {
    if (!consent) {
      setErrorMsg('사진 분석 동의에 체크해 주세요.');
      return;
    }
    if (!preview) {
      pickFromCamera();
      return;
    }
    onUpload?.(preview.file, preview.dataUrl);
  }

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar />
      <BackHeader label="STEP 01 / 03" title="정면 사진 업로드" onBack={onBack} />

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      <div style={{ flex: 1, padding: '24px 24px 0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h1 className="ko" style={{ margin: 0, fontSize: 22, fontWeight: 300, lineHeight: 1.32, letterSpacing: '-.01em' }}>
          정면 사진 한 장,<br />그게 전부예요
        </h1>
        <p className="ko" style={{ margin: '12px 0 18px', fontSize: 12.5, lineHeight: 1.7, color: '#5a5a5a', fontWeight: 300 }}>
          앞머리 없이 얼굴이 잘 보이는 정면 사진을 올려주세요.<br />사진은 외부 공유 · AI 학습에 사용되지 않아요.
        </p>

        <div style={{ margin: '0 0 16px' }}>
          <div style={{ paddingBottom: 8, marginBottom: 10, borderBottom: '1px solid #000' }}>
            <div className="label" style={{ fontSize: 9.5, letterSpacing: '.22em' }}>SHOOTING GUIDE · 촬영 예시</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            <GuideThumb variant="good" ok mark="DO" title="포니테일·민소매" sub="앞머리 올려서" />
            <GuideThumb variant="good-cam" ok mark="DO" title="후면 카메라" sub="광각·셀피 ✗" />
            <GuideThumb variant="bad-face" ok={false} mark="DON'T" title="앞머리·마스크" sub="얼굴 가리지 ✗" />
            <GuideThumb variant="bad-light-filter" ok={false} mark="DON'T" title="필터·역광" sub="원래 톤 그대로" />
          </div>
        </div>

        <div
          onClick={pickFromCamera}
          role="button"
          tabIndex={0}
          aria-label="사진 영역 — 탭하면 카메라가 열려요"
          className="tappable"
          style={{
            minHeight: 240, border: '1px dashed #000', position: 'relative', background: '#fafaf8',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {preview ? (
            <img
              src={preview.dataUrl}
              alt="업로드 미리보기"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <FacePlaceholder w="100%" h="100%" tone="light" label="" />
          )}
          {!preview && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, border: '1px solid #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                {Icons.plus(18)}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="label" style={{ marginBottom: 4 }}>UPLOAD PORTRAIT</div>
                <div className="ko" style={{ fontSize: 11.5, color: '#5a5a5a', fontWeight: 300 }}>탭해서 사진 선택 · 카메라</div>
              </div>
            </div>
          )}
          {preview && (
            <div style={{ position: 'absolute', top: 12, left: 14, padding: '4px 8px', background: '#000', color: '#fff' }}>
              <span className="label" style={{ fontSize: 9 }}>SELECTED</span>
            </div>
          )}
          <div className="serif-i" style={{ position: 'absolute', top: 12, right: 14, fontSize: 11, color: preview ? '#fff' : '#7a7a7a', textShadow: preview ? '0 1px 2px rgba(0,0,0,.4)' : 'none' }}>
            nº 01
          </div>
        </div>

        {/* 카메라 / 갤러리 명시적 선택 — 안드로이드/iOS 모두에서 사용자 의도가 분명. */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); pickFromCamera(); }}
            style={{ flex: 1, padding: '12px 0', background: '#fff', color: '#000', border: '1px solid #000', fontFamily: 'Pretendard', fontSize: 12.5, minHeight: 44, cursor: 'pointer' }}
          >
            카메라로 촬영
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); pickFromGallery(); }}
            style={{ flex: 1, padding: '12px 0', background: '#fff', color: '#000', border: '1px solid #000', fontFamily: 'Pretendard', fontSize: 12.5, minHeight: 44, cursor: 'pointer' }}
          >
            앨범에서 선택
          </button>
        </div>
        {import.meta.env.VITE_MOCK === 'true' && (
          // dev/mock 전용 — 운영 빌드에는 렌더되지 않는다.
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); useSampleFace(); }}
            style={{ marginTop: 8, width: '100%', padding: '11px 0', background: '#fff', color: '#c45a3b', border: '1px dashed #c45a3b', fontFamily: 'Pretendard', fontSize: 12, minHeight: 40, cursor: 'pointer' }}
          >
            🧪 샘플 얼굴 사용 (mock)
          </button>
        )}

        {/* 명시적 동의 체크 — Apple 5.1.1 / 한국 개보법 §15 정보주체 동의 표준. */}
        <label
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16,
            padding: '12px 14px', border: '1px solid #d4d4d4', background: '#fafaf8', cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setErrorMsg(''); }}
            style={{ marginTop: 3, width: 18, height: 18, accentColor: '#000', cursor: 'pointer', flexShrink: 0 }}
            aria-describedby="consent-desc"
          />
          <span id="consent-desc" className="ko" style={{ fontSize: 12, lineHeight: 1.6, color: '#1a1a1a', fontWeight: 300 }}>
            <b style={{ fontWeight: 500 }}>(필수)</b> 얼굴형 분석을 위해 사진을 일시 처리하는 데 동의합니다.
            <span style={{ color: '#7a7a7a' }}> 분석 즉시 폐기되며 외부 공유 · AI 학습에 쓰이지 않아요.</span>
          </span>
        </label>

        {errorMsg && (
          <div role="alert" style={{ marginTop: 12, padding: '10px 12px', background: '#fff5f0', borderLeft: '2px solid #c45a3b', color: '#c45a3b', fontSize: 12 }} className="ko">
            {errorMsg}
          </div>
        )}

        <div style={{ height: 18 }} />
      </div>

      <div style={{ padding: '14px 24px max(env(safe-area-inset-bottom), 28px)', borderTop: '1px solid #e8e8e8', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.18em', cursor: 'pointer' }}
        >
          BACK
        </button>
        <button
          onClick={next}
          aria-disabled={!preview || !consent}
          style={{
            flex: 2,
            background: preview && consent ? '#000' : '#5a5a5a',
            color: '#fff', border: 'none', padding: '14px 0',
            fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em',
            cursor: 'pointer', minHeight: 48,
            opacity: preview && consent ? 1 : 0.6,
          }}
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}

function MiniPortrait({ variant = 'good' }) {
  const isBadFace = variant === 'bad-face';
  return (
    <svg viewBox="0 0 80 96" width="100%" height="100%" style={{ display: 'block' }}>
      <rect x="0" y="0" width="80" height="96" fill="#f4f1eb" />
      {variant === 'bad-light-filter' && <rect x="40" y="0" width="40" height="96" fill="#000" opacity="0.22" />}
      <path d="M8 96 L8 78 Q40 64 72 78 L72 96 Z" fill="#1a1a1a" />
      <rect x="34" y="60" width="12" height="14" fill="#e8d5c0" />
      <ellipse cx="40" cy="44" rx="18" ry="22" fill="#e8d5c0" />
      {isBadFace ? (
        <>
          <path d="M22 30 Q40 14 58 30 L58 46 Q40 38 22 46 Z" fill="#2a1f15" />
          <path d="M24 32 Q32 44 40 36 Q48 44 56 32 L56 40 Q40 48 24 40 Z" fill="#2a1f15" />
        </>
      ) : (
        <>
          <path d="M24 30 Q40 16 56 30 L56 38 Q40 30 24 38 Z" fill="#2a1f15" />
          <ellipse cx="58" cy="36" rx="4" ry="6" fill="#2a1f15" />
        </>
      )}
      {!isBadFace && (<><circle cx="33" cy="44" r="1.5" fill="#1a1a1a" /><circle cx="47" cy="44" r="1.5" fill="#1a1a1a" /></>)}
      {!isBadFace && <path d="M36 54 Q40 56 44 54" stroke="#a06050" strokeWidth="1" fill="none" />}
      {isBadFace && <path d="M22 50 Q40 64 58 50 L58 62 Q40 70 22 62 Z" fill="#d8e8f0" stroke="#a8b8c0" strokeWidth="0.6" />}
      {variant === 'bad-light-filter' && <rect x="0" y="0" width="80" height="96" fill="#ff8da8" opacity="0.34" />}
      {variant === 'good-cam' && (
        <g>
          <rect x="56" y="68" width="18" height="26" rx="2.5" fill="#fff" stroke="#000" strokeWidth="1" />
          <circle cx="65" cy="76" r="3" fill="#1a1a1a" />
          <circle cx="65" cy="76" r="1.4" fill="#3a3a3a" />
          <rect x="60" y="84" width="10" height="1" fill="#000" />
          <rect x="60" y="87" width="10" height="1" fill="#000" />
        </g>
      )}
    </svg>
  );
}

function GuideThumb({ variant, ok, mark, title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ position: 'relative', aspectRatio: '5/6', border: `1px solid ${ok ? '#000' : '#d4d4d4'}`, background: '#f4f1eb', overflow: 'hidden' }}>
        <MiniPortrait variant={variant} />
        <div
          style={{
            position: 'absolute', top: 6, left: 6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
            background: ok ? '#000' : '#fff', color: ok ? '#fff' : '#000',
            border: ok ? 'none' : '1px solid #000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Jost', fontSize: 10, fontWeight: 500, lineHeight: 1, letterSpacing: '.05em',
          }}
        >
          {mark}
        </div>
      </div>
      <div>
        <div className="ko" style={{ fontSize: 11, fontWeight: 500, color: ok ? '#000' : '#3a3a3a', letterSpacing: '-.005em', lineHeight: 1.3 }}>{title}</div>
        <div className="ko" style={{ fontSize: 10, color: '#8a8a8a', letterSpacing: '-.005em', lineHeight: 1.4, marginTop: 2, fontWeight: 300 }}>{sub}</div>
      </div>
    </div>
  );
}
