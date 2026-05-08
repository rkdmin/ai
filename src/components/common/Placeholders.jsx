// Abstract placeholders matching wireframe — geometric, not real photos
import { Icons } from './Icons';

export function FacePlaceholder({ w = '100%', h = '100%', label = 'portrait', tone = 'dark' }) {
  const bg = tone === 'dark' ? '#1a1a1a' : '#efe9e3';
  const fg = tone === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const txt = tone === 'dark' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)';
  return (
    <div
      style={{
        width: w,
        height: h,
        background: bg,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `repeating-linear-gradient(135deg, ${fg} 0 1px, transparent 1px 12px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none" stroke={txt} strokeWidth="1">
          <ellipse cx="16" cy="14" rx="8" ry="10" />
          <path d="M11 13c.5-1 1.5-1.5 2.5-1.5M21 13c-.5-1-1.5-1.5-2.5-1.5" />
          <path d="M14 19c.5.6 1.2.9 2 .9s1.5-.3 2-.9" />
        </svg>
        {label && (
          <span
            style={{
              fontFamily: 'Jost',
              fontSize: 9,
              letterSpacing: '.25em',
              textTransform: 'uppercase',
              color: txt,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProductPlaceholder({ w = '100%', h = '100%', label = 'product' }) {
  return (
    <div style={{ width: w, height: h, background: '#0e0e0e', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 1px, transparent 1px 14px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '18%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '45%',
          aspectRatio: '1/1',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #d4b07a, #6b4f2b 60%, #3a2914)',
          boxShadow: 'inset 0 0 0 6px #1a1209, 0 12px 30px rgba(0,0,0,.5)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '45%',
          top: '58%',
          transform: 'translateY(-50%)',
          width: '35%',
          aspectRatio: '1/1',
          borderRadius: '50%',
          background: '#0a0a0a',
          border: '4px solid #2a1f12',
          boxShadow: '0 10px 24px rgba(0,0,0,.6)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          right: 14,
          bottom: 10,
          fontFamily: 'Jost',
          fontSize: 9,
          letterSpacing: '.25em',
          color: 'rgba(255,255,255,.35)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function MosaicOverlay({ warn }) {
  const cells = 7;
  const rows = Math.round(cells * 1.3);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backdropFilter: 'blur(2px)',
        background: 'rgba(0,0,0,.35)',
        display: 'grid',
        gridTemplateColumns: `repeat(${cells},1fr)`,
        gridTemplateRows: `repeat(${rows},1fr)`,
      }}
    >
      {Array.from({ length: cells * rows }).map((_, i) => {
        const v = (i * 37) % 100;
        const a = warn ? (v / 100) * 0.45 + 0.15 : (v / 100) * 0.5 + 0.2;
        return <div key={i} style={{ background: `rgba(255,255,255,${a})`, mixBlendMode: 'overlay' }} />;
      })}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 30,
            height: 30,
            border: '1px solid #fff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.5)',
          }}
        >
          {Icons.lock(13, '#fff')}
        </div>
      </div>
    </div>
  );
}
