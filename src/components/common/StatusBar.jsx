// iOS-style status bar — 9:41 + signal/wifi/battery glyphs
export function StatusBar({ dark }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 22px 6px',
        color: c,
        fontWeight: 600,
        fontSize: 14,
        fontFamily: '-apple-system,system-ui',
        flexShrink: 0,
      }}
    >
      <span style={{ letterSpacing: 0.2 }}>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11">
          <rect x="0" y="6" width="3" height="5" rx=".6" fill={c} />
          <rect x="4.5" y="4" width="3" height="7" rx=".6" fill={c} />
          <rect x="9" y="2" width="3" height="9" rx=".6" fill={c} />
          <rect x="13.5" y="0" width="3" height="11" rx=".6" fill={c} />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11">
          <path
            d="M7.5 3C9.5 3 11.3 3.8 12.6 5L13.5 4.1C12 2.5 9.9 1.5 7.5 1.5C5.1 1.5 3 2.5 1.5 4.1L2.4 5C3.7 3.8 5.5 3 7.5 3Z"
            fill={c}
          />
          <circle cx="7.5" cy="9.5" r="1.3" fill={c} />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11">
          <rect x=".5" y=".5" width="20" height="10" rx="2.5" stroke={c} strokeOpacity=".4" fill="none" />
          <rect x="2" y="2" width="17" height="7" rx="1.4" fill={c} />
          <rect x="21.5" y="3.5" width="1.5" height="4" rx=".5" fill={c} fillOpacity=".5" />
        </svg>
      </div>
    </div>
  );
}
