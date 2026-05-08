import { useRef, useState } from 'react';
import { Icons } from './common/Icons';

const GUIDE_TILES = [
  { type: 'do', title: '포니테일·민소매', sub: '앞머리 모두 올려서' },
  { type: 'do', title: '후면 기본 카메라', sub: '광각·셀피 금지' },
  { type: 'dont', title: '앞머리·마스크', sub: '얼굴 가리지 않기' },
  { type: 'dont', title: '필터·역광', sub: '자연광 정면에서' },
];

export default function PhotoUpload({ onUpload }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      onUpload?.(file, ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 22px 18px', borderBottom: '1px solid #000' }}>
        <div className="label" style={{ marginBottom: 6 }}>STEP 01 · UPLOAD</div>
        <div className="ko" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.02em', marginBottom: 6 }}>
          정면 사진을 올려주세요
        </div>
        <div className="ko" style={{ fontSize: 12, color: '#7a7a7a', fontWeight: 300 }}>
          분석 결과만 히스토리에 저장되고, 원본 사진은 외부에 공유되지 않아요.<br />
          사진은 외부 공유 · AI 학습에 사용되지 않아요.
        </div>
      </div>

      {/* Guide tiles */}
      <div style={{ padding: '22px 22px 0' }}>
        <div className="label" style={{ marginBottom: 12, color: '#7a7a7a' }}>SHOOT GUIDE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {GUIDE_TILES.map((g, i) => (
            <div key={i} style={{ border: '1px solid #000', padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label" style={{ fontSize: 9, color: g.type === 'do' ? '#000' : '#c45a3b' }}>
                  {g.type === 'do' ? '✓ DO' : '✗ DON\'T'}
                </span>
                <span className="serif-i" style={{ fontSize: 12, color: '#a8a8a8' }}>0{i + 1}</span>
              </div>
              <div style={{ flex: 1, background: g.type === 'do' ? '#f6f1ed' : '#1a1a1a', position: 'relative', minHeight: 60 }}>
                <GuideIllustration kind={i} type={g.type} />
              </div>
              <div>
                <div className="ko" style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{g.title}</div>
                <div className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300, lineHeight: 1.4 }}>{g.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div style={{ padding: '24px 22px 32px' }}>
        <div className="label" style={{ marginBottom: 12, color: '#7a7a7a' }}>YOUR PHOTO</div>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            aspectRatio: '1/1.2', background: preview ? '#000' : '#f6f1ed',
            border: '1px solid #000', position: 'relative', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundImage: preview ? `url(${preview})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        >
          {!preview && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {Icons.upload(28)}
              <div className="ko" style={{ fontSize: 13, fontWeight: 400 }}>탭하여 사진 업로드</div>
              <div className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300 }}>JPG · PNG · 10MB 이하</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

        <button
          disabled={!preview}
          onClick={() => preview && onUpload?.(null, preview)}
          style={{
            width: '100%', marginTop: 16, background: preview ? '#000' : '#e8e8e8',
            color: preview ? '#fff' : '#a8a8a8', border: 'none',
            padding: '16px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em',
            cursor: preview ? 'pointer' : 'not-allowed',
          }}
        >
          ANALYZE
        </button>
      </div>
    </div>
  );
}

function GuideIllustration({ kind, type }) {
  // Simple geometric illustrations — no celebrity images
  const stroke = type === 'do' ? '#7a6a5a' : '#a8a8a8';
  const fill = type === 'do' ? '#d8c9bb' : '#3a3a3a';
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
      {/* base figure */}
      <ellipse cx="50" cy="36" rx="16" ry="20" fill={fill} />
      <path d="M 26 80 Q 50 56 74 80 Z" fill={fill} opacity="0.7" />
      {kind === 0 && <path d="M 60 22 Q 75 36 70 56" stroke={stroke} strokeWidth="2" fill="none" />}
      {kind === 1 && <rect x="44" y="50" width="12" height="20" fill="#000" stroke={stroke} />}
      {kind === 2 && <rect x="34" y="38" width="32" height="14" fill="#000" opacity="0.6" />}
      {kind === 3 && <rect x="0" y="0" width="100" height="80" fill="#ff8aa0" opacity="0.18" />}
    </svg>
  );
}
