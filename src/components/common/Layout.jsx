import { Icons } from './Icons';

export function BackHeader({ title, label, onBack, right, dark = false }) {
  const c = dark ? '#fff' : '#000';
  const sub = dark ? 'rgba(255,255,255,.6)' : '#7a7a7a';
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 18px 14px', gap: 12, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', marginLeft: -6 }}
          aria-label="back"
        >
          {Icons.back(20, c)}
        </button>
        <div style={{ flex: 1 }}>
          {label && <div className="label" style={{ color: sub, marginBottom: 2 }}>{label}</div>}
          {title && (
            <div className="ko" style={{ fontSize: 14, fontWeight: 500, color: c, letterSpacing: '-.005em' }}>
              {title}
            </div>
          )}
        </div>
        {right}
      </div>
      <div style={{ height: 1, background: dark ? '#1a1a1a' : '#000', flexShrink: 0 }} />
    </>
  );
}

export function IndexMark({ n, dark = false }) {
  return (
    <span
      className="serif-i"
      style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.5)' : '#7a7a7a', letterSpacing: '.02em' }}
    >
      {n}
    </span>
  );
}

export function Section({ n, en, kr, children, last }) {
  return (
    <div style={{ padding: '26px 22px 0', marginBottom: last ? 30 : 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '1px solid #000',
        }}
      >
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

export function CtaTile({ label, kr, onClick, dark, br }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '22px 16px',
        borderRight: br ? '1px solid #000' : 'none',
        background: dark ? '#000' : '#fff',
        color: dark ? '#fff' : '#000',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: 'pointer',
        minHeight: 130,
        justifyContent: 'space-between',
      }}
    >
      <div className="label" style={{ color: dark ? 'rgba(255,255,255,.5)' : '#7a7a7a' }}>{label}</div>
      <div>
        <div className="ko" style={{ fontSize: 16, fontWeight: 400, letterSpacing: '-.005em', marginBottom: 8 }}>{kr}</div>
        {Icons.arrow(18, dark ? '#fff' : '#000')}
      </div>
    </div>
  );
}

export function StepDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 16 : 6,
            height: 1.5,
            background: i === current ? '#000' : i < current ? '#000' : '#d4d4d4',
          }}
        />
      ))}
    </div>
  );
}

export function TabBar({ active = 'home', dark = false, onNav }) {
  const tabs = [
    { id: 'home', label: 'HOME', icon: Icons.camera },
    { id: 'trend', label: 'TREND', icon: Icons.trend },
    { id: 'history', label: 'HISTORY', icon: Icons.archive },
    { id: 'my', label: 'MY', icon: Icons.user },
  ];
  const bg = dark ? '#000' : '#fff';
  const border = dark ? '#1a1a1a' : '#000';
  const activeColor = dark ? '#fff' : '#000';
  const muteColor = dark ? '#5a5a5a' : '#bdbdbd';
  return (
    <div
      style={{
        display: 'flex',
        background: bg,
        borderTop: `1px solid ${border}`,
        padding: '8px 0 22px',
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => (
        <div
          key={t.id}
          onClick={() => onNav?.(t.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          {t.icon(18, active === t.id ? activeColor : muteColor)}
          <span className="label" style={{ fontSize: 9, color: active === t.id ? activeColor : muteColor }}>
            {t.label}
          </span>
          {active === t.id && <div style={{ width: 14, height: 1, background: activeColor, marginTop: -1 }} />}
        </div>
      ))}
    </div>
  );
}
