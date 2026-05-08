import { Icons } from './Icons';

export function BackHeader({ label, title, onBack, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #000', gap: 12 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 4, display: 'flex', alignItems: 'center' }}>
        {Icons.back(18)}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <div className="label" style={{ fontSize: 9, color: '#7a7a7a', marginBottom: 2 }}>{label}</div>}
        <div className="ko" style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

export function IndexMark({ n }) {
  return <span className="serif-i" style={{ fontSize: 14, color: '#7a7a7a' }}>{n}</span>;
}

export function Section({ n, en, kr, children, last }) {
  return (
    <div style={{ padding: '26px 22px 0', marginBottom: last ? 30 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #000' }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>{en}</div>
          <div className="ko" style={{ fontSize: 13, fontWeight: 400, color: '#1a1a1a' }}>{kr}</div>
        </div>
        <IndexMark n={`nº ${n}`} />
      </div>
      {children}
    </div>
  );
}

export function CtaTile({ kicker, title, sub, onClick, dark, fullWidth }) {
  const bg = dark ? '#000' : '#fff';
  const fg = dark ? '#fff' : '#000';
  const border = dark ? 'none' : '1px solid #000';
  return (
    <button
      onClick={onClick}
      style={{
        width: fullWidth ? '100%' : 'auto',
        background: bg, color: fg, border, padding: '20px 22px',
        textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}
    >
      <div>
        {kicker && <div className="label" style={{ color: dark ? 'rgba(255,255,255,.6)' : '#7a7a7a', marginBottom: 6 }}>{kicker}</div>}
        <div className="ko" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-.01em', marginBottom: sub ? 4 : 0 }}>{title}</div>
        {sub && <div className="ko" style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.55)' : '#7a7a7a', fontWeight: 300 }}>{sub}</div>}
      </div>
      {Icons.arrow(18, fg)}
    </button>
  );
}
