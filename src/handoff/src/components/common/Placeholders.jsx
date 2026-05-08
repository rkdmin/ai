// Abstract face/figure placeholder — geometric, no real photos
export function FacePlaceholder({ w = '100%', h = '100%', tone = 'light', label = '' }) {
  const palettes = {
    light: { bg: '#efe7df', shape: '#d8c9bb', label: '#7a6a5a' },
    dark: { bg: '#1a1a1a', shape: '#3a3a3a', label: '#a8a8a8' },
    warm: { bg: '#f6f1ed', shape: '#e0d4c8', label: '#7a6a5a' },
    cool: { bg: '#eef2f6', shape: '#d2dae4', label: '#5a6a7a' },
  };
  const p = palettes[tone] || palettes.light;
  return (
    <div style={{ width: w, height: h, background: p.bg, position: 'relative', overflow: 'hidden' }}>
      {/* abstract human silhouette */}
      <svg width="100%" height="100%" viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`grad-${tone}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={p.shape} stopOpacity="0.9" />
            <stop offset="100%" stopColor={p.shape} stopOpacity="0.4" />
          </radialGradient>
        </defs>
        {/* shoulders */}
        <path d={`M 10 110 Q 50 70 90 110 Z`} fill={p.shape} opacity="0.6" />
        {/* head */}
        <ellipse cx="50" cy="42" rx="22" ry="28" fill={`url(#grad-${tone})`} />
        {/* neck */}
        <rect x="44" y="65" width="12" height="12" fill={p.shape} opacity="0.7" />
      </svg>
      {label && (
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: 'Jost', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.label }}>
          {label}
        </div>
      )}
    </div>
  );
}

export function MosaicOverlay({ warn }) {
  const cells = 7;
  return (
    <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,.35)', display: 'grid', gridTemplateColumns: `repeat(${cells},1fr)`, gridTemplateRows: `repeat(${Math.round(cells * 1.3)},1fr)` }}>
      {Array.from({ length: cells * Math.round(cells * 1.3) }).map((_, i) => {
        const v = ((i * 37) % 100);
        const a = warn ? (v / 100 * .45 + .15) : (v / 100 * .5 + .2);
        return <div key={i} style={{ background: `rgba(255,255,255,${a})`, mixBlendMode: 'overlay' }} />;
      })}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 30, height: 30, border: '1px solid #fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11V7a4 4 0 1 1 8 0v4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ProductPlaceholder({ category = 'product', tone = 'warm' }) {
  const palettes = {
    warm: { bg: '#f6f1ed', shape: '#d8c9bb' },
    cool: { bg: '#eef2f6', shape: '#c8d4e0' },
    dark: { bg: '#1a1a1a', shape: '#3a3a3a' },
  };
  const p = palettes[tone] || palettes.warm;
  return (
    <div style={{ width: '100%', height: '100%', background: p.bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40%', height: '60%', background: p.shape, borderRadius: 2 }} />
      <div style={{ position: 'absolute', bottom: 6, right: 8, fontFamily: 'Jost', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a7a7a' }}>
        {category}
      </div>
    </div>
  );
}
