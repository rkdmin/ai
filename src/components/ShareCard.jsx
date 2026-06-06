import { useRef, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';
import { tapHaptic, successHaptic } from '../hooks/useHaptic';

// 공유 카드. result + card 를 props 로 받아 카드 본문에 반영.
// 캡처(html2canvas)는 동적 import 라 미설치/실패 시 안전하게 폴백.
//
// 공유/저장 경로 (플랫폼 분기, Phase 6-2):
//   - Capacitor 네이티브(앱): 캡처 PNG 를 @capacitor/filesystem 으로 기기에 기록 →
//     공유는 @capacitor/share 네이티브 시트(files:[uri]), 저장은 Documents 에 기록.
//   - 웹/브라우저: navigator.share → 클립보드 폴백 / 저장은 <a download>.
const isNativePlatform = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;

// Blob → base64 (data: 프리픽스 제거) — Filesystem.writeFile 입력용.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function ShareCard({ result, card, variant = 'hair', photoUrl = null, synthesizedPhoto = null, onClose }) {
  const isMakeup = variant === 'makeup';
  const cardRef = useRef(null);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  async function captureCard() {
    // html2canvas 가 설치되어 있을 때만 PNG 캡처. 없으면 null 반환.
    if (!cardRef.current) return null;
    try {
      const mod = await import('html2canvas');
      const html2canvas = mod.default || mod;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#fff', scale: 2 });
      return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
    } catch {
      return null;
    }
  }

  // 네이티브: 캡처 blob 을 기기에 기록하고 file:// URI 반환. dir='cache'(공유 임시) | 'documents'(저장).
  async function writeImageFile(blob, dir) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64 = await blobToBase64(blob);
    const path = `beaumi-${variant}-${Date.now()}.png`;
    const directory = dir === 'documents' ? Directory.Documents : Directory.Cache;
    await Filesystem.writeFile({ path, data: base64, directory });
    const { uri } = await Filesystem.getUri({ path, directory });
    return uri;
  }

  async function onSave() {
    tapHaptic('medium');
    const blob = await captureCard();
    if (!blob) {
      showToast('브라우저에서 길게 눌러 이미지를 저장해 주세요.');
      return;
    }
    // 네이티브(앱): 기기 Documents 에 기록 (<a download> 는 WebView 에서 동작하지 않음).
    if (isNativePlatform()) {
      try {
        await writeImageFile(blob, 'documents');
        successHaptic();
        showToast('기기에 이미지를 저장했어요.');
      } catch {
        showToast('이미지를 저장하지 못했어요.');
      }
      return;
    }
    // 웹: 다운로드.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beaumi-${variant}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    successHaptic();
    showToast('이미지로 저장했어요.');
  }

  async function shareNative(label) {
    tapHaptic('light');
    const title = isMakeup ? 'Beaumi · 메이크업 결과' : 'Beaumi · 헤어 결과';
    const text = `${result?.styleLabel || (card?.name ?? 'My Beaumi result')} — ${(result?.moodArchetype || []).join(' · ')}`;
    const blob = await captureCard();

    // 네이티브(앱): 캡처 PNG 를 기기에 기록 → OS 네이티브 공유 시트(files:[uri]).
    if (isNativePlatform()) {
      try {
        const { Share } = await import('@capacitor/share');
        if (blob) {
          const uri = await writeImageFile(blob, 'cache');
          await Share.share({ title, text, files: [uri] });
        } else {
          await Share.share({ title, text, url: 'https://beaumi.app' });
        }
        return;
      } catch (e) {
        // 사용자가 시트를 닫으면 예외 → 조용히 무시. 그 외엔 아래 폴백 시도.
        const msg = String(e?.message || '');
        if (/cancel/i.test(msg) || /abort/i.test(msg)) return;
      }
    }

    // 웹: Web Share API → 클립보드 텍스트 복사 폴백.
    try {
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'beaumi.png', { type: 'image/png' })] })) {
        await navigator.share({
          title, text,
          files: [new File([blob], 'beaumi.png', { type: 'image/png' })],
        });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text, url: typeof window !== 'undefined' ? window.location.href : 'https://beaumi.app' });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${title}\n${text}`);
      showToast(`${label || '내용'}을 클립보드에 복사했어요.`);
    } catch {
      showToast('공유를 지원하지 않는 환경이에요.');
    }
  }

  async function onCopy() {
    tapHaptic('light');
    const url = typeof window !== 'undefined' ? window.location.href : 'https://beaumi.app';
    try {
      await navigator.clipboard.writeText(url);
      showToast('링크를 복사했어요.');
    } catch {
      showToast('클립보드에 접근할 수 없어요.');
    }
  }
  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <StatusBar dark />
      <BackHeader label="SHARE" title={isMakeup ? '메이크업 결과 공유' : '결과 공유'} onBack={onClose} dark />

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div ref={cardRef} style={{ background: '#fff', color: '#000', position: 'relative' }}>
          <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="wm" style={{ fontSize: 14, fontWeight: 300 }}>beaumi</span>
            <span className="serif-i" style={{ fontSize: 11, color: '#7a7a7a' }}>{isMakeup ? 'AI Makeup' : 'AI Beauty Coach'}</span>
          </div>

          {isMakeup
            ? <MakeupBody result={result} card={card} />
            : <HairBody result={result} card={card} photoUrl={photoUrl} synthesizedPhoto={synthesizedPhoto} />}

          <div
            style={{
              padding: '10px 18px 14px', borderTop: '1px solid #000',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span className="serif-i" style={{ fontSize: 11, color: '#7a7a7a' }}>beaumi.app</span>
            <div
              style={{
                width: 30, height: 30,
                background: 'repeating-conic-gradient(#000 0 25%,#fff 0 50%) 50% 50% / 6px 6px',
                border: '1px solid #000',
              }}
            />
          </div>
        </div>

        {/* 1차 CTA — 저장. 외부 공유/링크는 2차로 내린다 (Phase 4-8). */}
        <button
          onClick={onSave}
          className="tappable"
          style={{
            background: '#fff', color: '#000', border: 'none', padding: '15px 0',
            fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer',
          }}
        >
          SAVE IMAGE
        </button>
        <div className="label" style={{ color: 'rgba(255,255,255,.4)', fontSize: 9, textAlign: 'center', marginTop: 2 }}>OR SHARE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ShareButton label="공유" icon={Icons.insta} onClick={() => shareNative('결과')} />
          <ShareButton label="링크 복사" icon={Icons.link} onClick={onCopy} />
        </div>
        <div style={{ height: 14 }} />
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: 'max(env(safe-area-inset-bottom), 28px)', left: '50%',
            transform: 'translateX(-50%)', background: 'rgba(255,255,255,.96)', color: '#000',
            padding: '10px 16px', fontSize: 12.5, maxWidth: 360, textAlign: 'center',
            border: '1px solid #000', zIndex: 100,
          }}
          className="ko"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// 공유 카드 내 이미지 슬롯. 실제 사진(data URL/Storage URL)이 있으면 반영, 없으면 placeholder.
function ShareImage({ src, label, border = false, ratio = '1/1.1' }) {
  return (
    <div
      style={{
        aspectRatio: ratio, position: 'relative', background: '#f6f1ed',
        borderRight: border ? '1px solid #e8e8e8' : 'none',
        borderBottom: ratio === '1/1' ? '1px solid #e8e8e8' : 'none',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <FacePlaceholder w="100%" h="100%" tone="light" label="" />
      )}
      <span className="label" style={{ position: 'absolute', top: 8, left: 10, fontSize: 9, background: '#fff', padding: '1px 5px' }}>{label}</span>
    </div>
  );
}

function ShareButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 0',
        border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: 'rgba(255,255,255,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
      }}
    >
      {icon ? icon(14, 'rgba(255,255,255,.7)') : <span style={{ fontFamily: 'Jost', fontSize: 12, fontWeight: 500 }}>K</span>}
      <span className="label" style={{ fontSize: 9 }}>{label}</span>
    </button>
  );
}

function HairBody({ result, card, photoUrl, synthesizedPhoto }) {
  const label = result?.styleLabel || '봄날의 햇살형';
  const subEn = result?.faceTypeEn || 'egg shape · spring warm';
  const tags = card?.name
    ? [card.name, '우아한 분위기 룩', 'ELEGANT MOOD']
    : ['쿠션 단발', '우아한 분위기 룩', 'ELEGANT MOOD'];
  return (
    <>
      <div style={{ padding: '14px 18px 18px', textAlign: 'center', borderBottom: '1px solid #e8e8e8' }}>
        <div className="ko" style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-.015em', lineHeight: 1.15 }}>{label}</div>
        <div className="serif-i" style={{ fontSize: 13, color: '#5a5a5a', marginTop: 6 }}>{subEn}</div>
      </div>
      {synthesizedPhoto ? (
        // 합성 사진이 있으면 before/after 비교형 — 실제 이미지를 반영한다.
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e8e8e8' }}>
          <ShareImage src={photoUrl} label="BEFORE" border />
          <ShareImage src={synthesizedPhoto} label="AFTER" />
        </div>
      ) : (
        // 합성 사진이 없으면 결과 카드형 — 가짜 AFTER 를 만들지 않는다.
        <ShareImage src={photoUrl} label="REFERENCE" ratio="1/1" />
      )}
      <div
        style={{ padding: '12px 18px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid #e8e8e8' }}
      >
        <div style={{ display: 'flex' }}>
          {[
            ['#f3d9c8', '#c97b6e'],
            ['#ede2d0', '#a8896f'],
            ['#e0d4c4', '#7a6549'],
          ].map((cs, i) => (
            <div
              key={i}
              style={{
                width: 22, height: 22, borderRadius: 11,
                marginLeft: i > 0 ? -6 : 0,
                background: `radial-gradient(circle at 30% 30%, ${cs[1]} 0%, ${cs[0]} 70%)`,
                border: '1px solid #fff',
              }}
            />
          ))}
        </div>
        <span className="ko" style={{ fontSize: 11, fontWeight: 300 }}>
          {(result?.moodArchetype || ['ROMANTIC', 'CLEAN', 'SOFT']).join(' · ')}
        </span>
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tags.map((t, i) => (
          <span
            key={i}
            className="label"
            style={{
              padding: '4px 8px', border: '1px solid #000',
              background: i === 0 ? '#000' : '#fff', color: i === 0 ? '#fff' : '#000',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </>
  );
}

function MakeupBody({ result, card }) {
  const name = card?.name || '우아한 분위기 룩';
  const faceType = result?.faceType || '계란형';
  return (
    <>
      <div style={{ padding: '12px 18px 14px', borderBottom: '1px solid #e8e8e8' }}>
        <div className="ko" style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-.01em', marginBottom: 4 }}>{name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300 }}>ELEGANT · Semi-Glow</span>
          <span className="label" style={{ padding: '1px 6px', border: '1px solid #000', fontSize: 9 }}>{faceType}</span>
        </div>
      </div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e8e8' }}>
        <div className="label" style={{ marginBottom: 10 }}>COLOR PALETTE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {[
            { p: 'BASE', c: '#f5e6d3' },
            { p: 'BLUSH', c: '#e8a89c' },
            { p: 'LIPS', c: '#c97b6e' },
            { p: 'EYES', c: '#8b7355' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ aspectRatio: '1/1', background: s.c }} />
              <span className="label" style={{ fontSize: 8.5, textAlign: 'center' }}>{s.p}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <div className="label" style={{ marginBottom: 8 }}>PERSONAL FIT</div>
        {[
          ['입체적인 골격', '앞볼 집중 블러셔'],
          ['부드러운 눈매', '꼬리 올린 아이라인'],
          ['균형잡힌 비율', '누드 그라데이션 립'],
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11 }}>
            <span className="ko" style={{ fontWeight: 300 }}>{r[0]}</span>
            <span className="ko" style={{ fontWeight: 500 }}>→ {r[1]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
