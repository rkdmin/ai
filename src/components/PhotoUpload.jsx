import { useRef, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

// 정면 사진 1장 업로드. file picker → FileReader → onUpload(file, dataUrl).
// NEXT 버튼은 파일이 선택된 경우에만 진행, 아니면 picker 를 다시 연다.
export default function PhotoUpload({ onUpload, onBack }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { file, dataUrl }

  function pickFile() {
    fileRef.current?.click();
  }
  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file, dataUrl: reader.result });
    reader.readAsDataURL(file);
  }
  function next() {
    if (!preview) {
      pickFile();
      return;
    }
    onUpload?.(preview.file, preview.dataUrl);
  }

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar />
      <BackHeader label="STEP 01 / 03" title="정면 사진 업로드" onBack={onBack} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            <GuideThumb variant="good" ok mark="DO" title="포니테일·민소매" sub="앞머리 모두 올려서" />
            <GuideThumb variant="good-cam" ok mark="DO" title="후면 기본 카메라" sub="광각·셀피 금지" />
            <GuideThumb variant="bad-face" ok={false} mark="DON'T" title="앞머리·마스크" sub="얼굴 가리지 않기" />
            <GuideThumb variant="bad-light-filter" ok={false} mark="DON'T" title="필터·역광" sub="원래 톤 그대로" />
          </div>
        </div>

        <div
          onClick={pickFile}
          style={{
            minHeight: 240, border: '1px dashed #000', position: 'relative', background: '#fafaf8',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
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
          style={{ flex: 2, background: '#000', color: '#fff', border: 'none', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}
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
