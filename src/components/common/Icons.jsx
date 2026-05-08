// Icons — line-art set matching Beaumi Hi-Fi wireframe
export const Icons = {
  camera: (s = 22, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="1.1">
      <rect x="3" y="8.5" width="26" height="18" rx="1.5" />
      <path d="M11 8.5L13 5.5h6L21 8.5" />
      <circle cx="16" cy="17.5" r="5" />
    </svg>
  ),
  sparkle: (s = 22, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="1.1">
      <path d="M16 4v8M16 20v8M4 16h8M20 16h8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.5" />
    </svg>
  ),
  archive: (s = 22, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="1.1">
      <rect x="4" y="10" width="24" height="18" rx="1" />
      <path d="M3 6h26v4H3z" />
      <path d="M13 16h6" />
    </svg>
  ),
  user: (s = 22, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke={c} strokeWidth="1.1">
      <circle cx="16" cy="12" r="5" />
      <path d="M5 28c0-6 5-10 11-10s11 4 11 10" />
    </svg>
  ),
  bell: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M6 9a6 6 0 1112 0c0 5 2 7 2 7H4s2-2 2-7z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  ),
  menu: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M4 8h16M4 16h10" strokeLinecap="round" />
    </svg>
  ),
  arrow: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  back: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trend: (s = 22, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M3 17l6-6 4 4 8-9" strokeLinecap="round" />
      <path d="M14 6h7v7" strokeLinecap="round" />
    </svg>
  ),
  close: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  share: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M12 4v12M12 4l-4 4M12 4l4 4M5 14v6h14v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lock: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  ),
  check: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.4">
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  warn: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M12 4l10 17H2L12 4z" />
      <path d="M12 10v5M12 18.5v.1" strokeLinecap="round" />
    </svg>
  ),
  wifiOff: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M3 5l18 14M2 9c2-1.5 4-2.5 6-3M22 9c-2-1.5-4-2.5-6-3M5 13c1-.7 2-1.2 3-1.5M19 13c-1-.7-2-1.2-3-1.5" />
      <circle cx="12" cy="18" r="1.2" fill={c} />
    </svg>
  ),
  swap: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M3 8h14M13 4l4 4-4 4M21 16H7M11 12l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (s = 22, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M7 4l13 8-13 8z" /></svg>
  ),
  insta: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill={c} />
    </svg>
  ),
  search: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  ),
  gear: (s = 18, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  ),
  link: (s = 20, c = '#000') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.2">
      <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" strokeLinecap="round" />
    </svg>
  ),
};
