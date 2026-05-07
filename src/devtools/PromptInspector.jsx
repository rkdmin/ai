import { useEffect, useState } from 'react'
import { INSPECTOR_ENABLED, subscribe, clearRecords } from './inspector'

/**
 * 개발자 전용 프롬프트/응답 인스펙터 패널
 * VITE_DEV_INSPECTOR=true 일 때만 렌더링. 운영 빌드에서는 컴포넌트 본문이
 * 데드코드 제거 대상이 되어 0 byte에 가까워진다.
 */

const styles = {
  fab: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
    width: 48, height: 48, borderRadius: '50%', border: 'none',
    background: '#1f2937', color: '#fff', fontSize: 22, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)',
    background: '#0f172a', color: '#e2e8f0', zIndex: 10000,
    display: 'flex', flexDirection: 'column',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12,
  },
  header: {
    padding: '12px 16px', borderBottom: '1px solid #1e293b',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  title: { fontSize: 14, fontWeight: 600, flex: 1 },
  iconBtn: {
    background: 'transparent', border: '1px solid #334155',
    color: '#cbd5e1', padding: '4px 10px', borderRadius: 4,
    cursor: 'pointer', fontSize: 11,
  },
  list: { flex: 1, overflow: 'auto', padding: 8 },
  empty: { padding: 24, textAlign: 'center', color: '#64748b' },
  record: {
    background: '#1e293b', borderRadius: 6, marginBottom: 8,
    border: '1px solid #334155',
  },
  recordSummary: {
    padding: '10px 12px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: 8, listStyle: 'none',
  },
  kind: { fontWeight: 600, color: '#a5f3fc' },
  errorKind: { fontWeight: 600, color: '#fca5a5' },
  meta: { color: '#94a3b8', flex: 1 },
  body: { padding: '0 12px 12px', borderTop: '1px solid #334155' },
  section: { marginTop: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  pre: {
    background: '#0f172a', padding: 8, borderRadius: 4,
    maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap',
    wordBreak: 'break-word', fontSize: 11, color: '#e2e8f0',
    border: '1px solid #1e293b',
  },
  imageRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  thumb: {
    border: '1px solid #334155', borderRadius: 4, padding: 4,
    fontSize: 10, color: '#94a3b8', background: '#0f172a',
  },
  thumbImg: { width: 80, height: 80, objectFit: 'cover', display: 'block', borderRadius: 2 },
  copyBtn: {
    background: 'transparent', border: '1px solid #475569',
    color: '#cbd5e1', padding: '2px 8px', borderRadius: 3,
    cursor: 'pointer', fontSize: 10,
  },
}

function formatBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b}B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
  return `${(b / 1024 / 1024).toFixed(1)}MB`
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

function downloadJson(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gemini-${record.kind}-${record.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function Section({ label, value, copyable }) {
  if (value == null || value === '') return null
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabel}>
        <span>{label}</span>
        {copyable && (
          <button style={styles.copyBtn} onClick={() => copyText(text)}>copy</button>
        )}
      </div>
      <pre style={styles.pre}>{text}</pre>
    </div>
  )
}

function ImagePreview({ images }) {
  if (!images?.length) return null
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabel}><span>IMAGES ({images.length})</span></div>
      <div style={styles.imageRow}>
        {images.map((img, i) => (
          <div key={i} style={styles.thumb}>
            {img.dataUrl && <img src={img.dataUrl} alt={img.angle} style={styles.thumbImg} />}
            <div style={{ marginTop: 4 }}>{img.angle}</div>
            {img.sizeBytes ? <div>{formatBytes(img.sizeBytes)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function Record({ record }) {
  const isError = !!record.error
  return (
    <details style={styles.record}>
      <summary style={styles.recordSummary}>
        <span style={isError ? styles.errorKind : styles.kind}>
          {isError ? '✕' : '●'} {record.kind}
        </span>
        <span style={styles.meta}>
          {record.duration}ms
          {record.tokens?.totalTokenCount ? ` · ${record.tokens.totalTokenCount}tok` : ''}
        </span>
        <button style={styles.copyBtn} onClick={(e) => { e.preventDefault(); downloadJson(record) }}>
          json
        </button>
      </summary>
      <div style={styles.body}>
        <Section label={`Model · ${record.model}`} value={null} />
        <ImagePreview images={record.images} />
        <Section label="Prompt" value={record.prompt} copyable />
        {record.tokens && <Section label="Token Usage" value={record.tokens} />}
        <Section label="Raw Response" value={record.rawResponse} copyable />
        {record.outputImage && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}><span>Output Image</span></div>
            <img src={record.outputImage} alt="output" style={{ maxWidth: '100%', borderRadius: 4 }} />
          </div>
        )}
        {record.error && <Section label="Error" value={record.error} />}
      </div>
    </details>
  )
}

export default function PromptInspector() {
  const [records, setRecords] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!INSPECTOR_ENABLED) return undefined
    return subscribe(setRecords)
  }, [])

  if (!INSPECTOR_ENABLED) return null

  return (
    <>
      <button
        style={styles.fab}
        onClick={() => setOpen(o => !o)}
        title="Prompt Inspector"
        aria-label="Open prompt inspector"
      >
        🐞
      </button>
      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <span style={styles.title}>Gemini Prompt Inspector ({records.length})</span>
            <button style={styles.iconBtn} onClick={() => clearRecords()}>clear</button>
            <button style={styles.iconBtn} onClick={() => setOpen(false)}>×</button>
          </div>
          <div style={styles.list}>
            {records.length === 0 ? (
              <div style={styles.empty}>아직 호출 기록이 없어요. 사진을 분석해 보세요.</div>
            ) : (
              records.map(r => <Record key={r.id} record={r} />)
            )}
          </div>
        </div>
      )}
    </>
  )
}
