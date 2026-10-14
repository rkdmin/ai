import { useRef, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { isNativePlatform, openPhotoPermissionSettings } from '../utils/platform';
import { validatePhoto } from '../api/ai';
import faceGuideAsset from '../assets/figma/face-guide-oval.svg';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const GUIDE_ITEMS = [
  '앞머리를 올리고 정면을 바라봐요',
  '후면 기본 카메라로 촬영해요',
  '얼굴 전체 윤곽과 어깨가 보여요',
  '밝은 곳에서 역광 없이 촬영해요',
  '필터 없이 자연스러운 표정을 지어요',
];
const AVOID_ITEMS = ['측면 사진', '얼굴 가림', '강한 필터'];
const VALIDATION_LABELS = [
  ['imageDecoded', '사진을 확인했어요'],
  ['faceDetected', '얼굴이 확인됐어요'],
  ['singleFace', '한 명의 얼굴이 보여요'],
  ['faceLargeEnough', '얼굴 크기가 충분해요'],
];

export default function PhotoUpload({ onUpload, onBack }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const validationIdRef = useRef(0);
  const [preview, setPreview] = useState(null);
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validation, setValidation] = useState({ status: 'idle', result: null });
  const [permissionDenied, setPermissionDenied] = useState(false);

  function inspectSelection(file, dataUrl) {
    const id = ++validationIdRef.current;
    setPreview({ file, dataUrl });
    setValidation({ status: 'checking', result: null });
    setErrorMsg('');
    validatePhoto(dataUrl)
      .then((result) => {
        if (id === validationIdRef.current) setValidation({ status: 'done', result });
      })
      .catch((error) => {
        if (id !== validationIdRef.current) return;
        if (error?.code) {
          setValidation({
            status: 'done',
            result: { ok: false, code: error.code, message: error.message, checks: {} },
          });
          return;
        }
        setValidation({ status: 'error', result: null });
        setErrorMsg(error?.message || '사진을 확인하지 못했어요. 다른 사진을 선택해 주세요.');
      });
  }

  function resetSelection() {
    validationIdRef.current += 1;
    setPreview(null);
    setConsent(false);
    setValidation({ status: 'idle', result: null });
    setErrorMsg('');
  }

  async function pickNative(useCamera) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1280,
        resultType: CameraResultType.DataUrl,
        source: useCamera ? CameraSource.Camera : CameraSource.Photos,
        allowEditing: false,
        correctOrientation: true,
      });
      const dataUrl = photo?.dataUrl;
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      if (blob.size > MAX_FILE_BYTES) {
        setErrorMsg('사진 용량은 10MB 이하만 업로드할 수 있어요.');
        return;
      }
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      inspectSelection(new File([blob], `capture.${ext}`, { type: blob.type || 'image/jpeg' }), dataUrl);
    } catch (error) {
      const msg = String(error?.message || '');
      if (/cancel/i.test(msg) || /No image/i.test(msg)) return;
      if (/permission|denied|not authorized|권한/i.test(msg)) {
        setPermissionDenied(true);
        return;
      }
      setErrorMsg('카메라를 열 수 없어요. 권한을 확인하고 다시 시도해 주세요.');
    }
  }

  function pickFromCamera() {
    if (isNativePlatform()) pickNative(true);
    else cameraRef.current?.click();
  }

  function pickFromGallery() {
    if (isNativePlatform()) pickNative(false);
    else galleryRef.current?.click();
  }

  function onFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg('사진 용량은 10MB 이하만 업로드할 수 있어요.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일만 업로드할 수 있어요.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      inspectSelection(file, reader.result);
    };
    reader.onerror = () => setErrorMsg('파일을 읽을 수 없어요. 다시 시도해 주세요.');
    reader.readAsDataURL(file);
  }

  async function loadSampleFace() {
    try {
      const { default: url } = await import('../assets/dev-sample-face.jpg');
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'dev-sample-face.jpg', { type: blob.type || 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = () => {
        inspectSelection(file, reader.result);
        setConsent(true);
      };
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
      pickFromGallery();
      return;
    }
    if (validation.status !== 'done' || !validation.result?.ok) {
      setErrorMsg(validation.status === 'checking' ? '사진과 얼굴을 확인하고 있어요.' : '다른 사진을 선택해 주세요.');
      return;
    }
    onUpload?.(preview.file, preview.dataUrl);
  }

  const failedValidation = preview && validation.status === 'done' && validation.result?.ok === false;

  if (permissionDenied) {
    return (
      <PhotoPermissionDenied
        native={isNativePlatform()}
        onSettings={async () => {
          const opened = await openPhotoPermissionSettings();
          if (!opened) {
            setPermissionDenied(false);
            pickFromGallery();
          }
        }}
        onReselect={() => { setPermissionDenied(false); pickFromGallery(); }}
        onCancel={() => setPermissionDenied(false)}
      />
    );
  }

  if (failedValidation) {
    return (
      <PhotoValidationError
        code={validation.result.code}
        message={validation.result.message}
        onChoose={pickFromGallery}
        onGuide={resetSelection}
      >
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFileChange} />
      </PhotoValidationError>
    );
  }

  return (
    <div className="wf-screen">
      <StatusBar />
      <BackHeader title={preview ? '선택한 사진 확인' : '사진 가이드'} onBack={onBack} />

      <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={onFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFileChange} />

      <main className="wf-scroll" style={{ padding: '20px 20px 0' }}>
        {preview ? (
          <PhotoConfirmation
            preview={preview.dataUrl}
            consent={consent}
            validation={validation}
            onConsent={(checked) => { setConsent(checked); if (checked) setErrorMsg(''); }}
          />
        ) : (
          <PhotoGuide />
        )}

        {import.meta.env.VITE_MOCK === 'true' && (
          <button type="button" onClick={loadSampleFace} style={{ marginTop: 14, width: '100%', minHeight: 42, border: '1px dashed #c2413b', borderRadius: 8, background: '#fff', color: '#c2413b', fontWeight: 600 }}>
            샘플 얼굴 사용 (mock)
          </button>
        )}
        {errorMsg && <div role="alert" className="ko" style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13, lineHeight: 1.45 }}>{errorMsg}</div>}
        <div style={{ height: 20 }} />
      </main>

      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '16px 20px max(env(safe-area-inset-bottom), 20px)', background: '#fff', flexShrink: 0 }}>
        {preview ? (
          <>
            <button type="button" className="wf-btn-primary" onClick={next} disabled={validation.status === 'checking'} aria-disabled={!consent || validation.status !== 'done' || !validation.result?.ok}>이 사진으로 분석하기</button>
            <button type="button" className="wf-btn-ghost" onClick={pickFromGallery}>다른 사진 선택</button>
          </>
        ) : (
          <>
            <button type="button" className="wf-btn-primary" onClick={pickFromGallery}>사진 선택하기</button>
            <button type="button" className="wf-btn-ghost" onClick={pickFromCamera}>카메라로 촬영</button>
          </>
        )}
      </footer>
    </div>
  );
}

function PhotoGuide() {
  return (
    <>
      <h1 className="ko" style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-.025em' }}>정확한 분석을 위해<br />이렇게 촬영해주세요</h1>
      <div style={{ height: 220, marginTop: 16, border: '1px solid #d1d5db', borderRadius: 8, background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <img src={faceGuideAsset} alt="정면 얼굴 위치 가이드" width="100" height="130" />
        <span className="ko" style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>얼굴을 가이드 안에 맞춰주세요</span>
      </div>
      <div style={{ display: 'grid', gap: 6, marginTop: 16 }}>
        {GUIDE_ITEMS.map((item) => (
          <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#374151', fontSize: 13, fontWeight: 500 }}><strong aria-hidden="true">✓</strong><span>{item}</span></div>
        ))}
      </div>
      <p className="ko" style={{ margin: '16px 0 20px', color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>얼굴선과 비율이 잘 보이는 사진일수록<br />더 안정적으로 분석할 수 있어요.</p>
      <h2 className="ko" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>피하면 좋은 사진</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {AVOID_ITEMS.map((item) => (
          <div key={item} style={{ textAlign: 'center' }}>
            <div style={{ height: 76, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#9ca3af' }} aria-hidden="true">✕</div>
            <div className="ko" style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{item}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function PhotoConfirmation({ preview, consent, validation, onConsent }) {
  return (
    <>
      <h1 className="ko" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>이 사진으로 분석할까요?</h1>
      <div style={{ height: 320, marginTop: 24, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#f3f4f6' }}>
        <img src={preview} alt="선택한 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 24, color: '#374151', fontSize: 14 }}>
        {validation.status === 'checking' && (
          <div role="status" style={{ display: 'flex', gap: 8 }}><span aria-hidden="true">•</span><span>사진과 얼굴을 확인하고 있어요</span></div>
        )}
        {validation.status === 'done' && validation.result?.ok && VALIDATION_LABELS
          .filter(([key]) => validation.result.checks?.[key])
          .map(([key, label]) => (
            <div key={key} style={{ display: 'flex', gap: 8 }}><strong aria-hidden="true">✓</strong><span>{label}</span></div>
          ))}
      </div>
      <p className="ko" style={{ margin: '20px 0 12px', color: '#9ca3af', fontSize: 12 }}>사진은 Beauty Mood 분석을 위해 사용돼요.</p>
      <label className="wf-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, background: '#f9fafb', cursor: 'pointer' }}>
        <input type="checkbox" checked={consent} onChange={(event) => onConsent(event.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: '#111827', flexShrink: 0 }} />
        <span className="ko" style={{ fontSize: 12, lineHeight: 1.55, color: '#374151' }}><strong>(필수)</strong> 얼굴형 분석을 위한 사진의 일시 처리에 동의합니다. 사진은 외부 공유나 AI 학습에 사용되지 않아요.</span>
      </label>
    </>
  );
}

const PHOTO_ERROR_COPY = {
  NO_FACE: {
    title: '사진을 분석하기 어려워요',
    placeholder: 'Face not detected',
    lines: ['얼굴 전체가 보이는 정면 사진을 선택해 주세요.', '얼굴이 가려지거나 너무 작으면 확인하기 어려워요.'],
  },
  MULTIPLE_FACES: {
    title: '한 명의 얼굴만 선택해 주세요',
    placeholder: 'Multiple faces',
    lines: ['사진에 여러 명이 함께 있어요.', '한 명의 얼굴이 선명하게 보이는 사진을 사용해 주세요.'],
  },
  FACE_TOO_SMALL: {
    title: '얼굴이 더 크게 보이는 사진이 필요해요',
    placeholder: 'Face too small',
    lines: ['얼굴이 사진에서 너무 작게 보여요.', '얼굴 전체가 화면을 충분히 채우는 사진을 선택해 주세요.'],
  },
  INVALID_IMAGE: {
    title: '사진 파일을 읽지 못했어요',
    placeholder: 'Invalid image',
    lines: ['선택한 사진 파일을 확인할 수 없어요.', 'JPG 또는 PNG 사진으로 다시 선택해 주세요.'],
  },
};

export function PhotoValidationError({ code, message, onChoose, onGuide, children }) {
  const copy = PHOTO_ERROR_COPY[code] || PHOTO_ERROR_COPY.INVALID_IMAGE;
  return (
    <div className="wf-screen">
      <StatusBar />
      {children}
      <main className="wf-scroll" style={{ padding: '52px 20px 24px' }}>
        <h1 className="ko" style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.35 }}>{copy.title}</h1>
        <div style={{ height: 240, marginTop: 28, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', display: 'grid', placeItems: 'center', fontSize: 14 }}>
          {copy.placeholder}
        </div>
        <div className="ko" style={{ marginTop: 28, fontSize: 15, lineHeight: 1.45 }}>
          {copy.lines.map((line) => <div key={line}>{line}</div>)}
          {message && !PHOTO_ERROR_COPY[code] && <div>{message}</div>}
        </div>
      </main>
      <footer style={{ padding: '16px 20px max(env(safe-area-inset-bottom), 20px)', background: 'var(--color-bg)' }}>
        <button type="button" className="wf-btn-primary" onClick={onChoose}>다른 사진 선택하기</button>
        {code !== 'MULTIPLE_FACES' && <button type="button" className="wf-btn-ghost" onClick={onGuide}>사진 가이드 다시 보기 →</button>}
      </footer>
    </div>
  );
}

export function PhotoPermissionDenied({ native, onSettings, onReselect, onCancel }) {
  return (
    <div className="wf-screen">
      <StatusBar />
      <main style={{ flex: 1, padding: '180px 20px 24px', textAlign: 'center' }}>
        <h1 className="ko" style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>사진 접근 권한이 필요해요</h1>
        <p className="ko" style={{ margin: '24px 0 0', fontSize: 15, lineHeight: 1.45 }}>
          {native ? '사진을 선택하려면 사진 보관함 접근 권한을 허용해 주세요.' : '브라우저에서 사진을 다시 선택해 주세요.'}
        </p>
      </main>
      <footer style={{ padding: '16px 20px max(env(safe-area-inset-bottom), 20px)', background: 'var(--color-bg)' }}>
        <button type="button" className="wf-btn-primary" onClick={native ? onSettings : onReselect}>
          {native ? '설정에서 권한 허용하기' : '사진 다시 선택하기'}
        </button>
        <button type="button" className="wf-btn-ghost" onClick={onCancel}>취소</button>
      </footer>
    </div>
  );
}
