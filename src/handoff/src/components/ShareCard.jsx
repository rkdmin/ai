import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

export default function ShareCard({ result, card, onClose, onCopy, onSave }) {
  const faceType = result?.faceType || '계란형';
  const styleName = card?.name || '쿠션 단발';
  const moodKeys = result?.moodArchetype || ['ROMANTIC', 'CLEAN', 'SOFT'];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#1a1a1a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4 }}>
          {Icons.close(20, '#fff')}
        </button>
        <span className="label" style={{ fontSize: 9, color: 'rgba(255,255,255,.6)' }}>SHARE</span>
        <span style={{ width: 28 }} />
      </div>

      {/* Card preview */}
      <div style={{ flex: 1, padding: '14px 22px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', color: '#000', padding: '24px 22px 26px', flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 380, margin: '0 auto', width: '100%' }}>
          <div className="label" style={{ marginBottom: 8, color: '#7a7a7a' }}>BEAUMI · MY ANALYSIS</div>
          <div className="serif-i" style={{ fontSize: 28, marginBottom: 4 }}>{faceType}</div>
          <div className="ko" style={{ fontSize: 12, color: '#7a7a7a', marginBottom: 18 }}>FACE TYPE</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 18 }}>
            <div style={{ aspectRatio: '1/1.2' }}>
              <FacePlaceholder w="100%" h="100%" tone="dark" label="before" />
            </div>
            <div style={{ aspectRatio: '1/1.2' }}>
              <FacePlaceholder w="100%" h="100%" tone="warm" label="after" />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #000', paddingTop: 14, marginBottom: 16 }}>
            <div className="label" style={{ fontSize: 9, color: '#7a7a7a', marginBottom: 4 }}>BEST MATCH</div>
            <div className="ko" style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-.01em' }}>{styleName}</div>
          </div>

          <div>
            <div className="label" style={{ fontSize: 9, color: '#7a7a7a', marginBottom: 6 }}>MOOD KEYS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {moodKeys.map((m, i) => (
                <span key={i} className="label" style={{ fontSize: 9, padding: '5px 8px', border: '1px solid #000' }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '0 22px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onSave} style={{ background: 'none', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}>
          SAVE IMAGE
        </button>
        <button onClick={onCopy} style={{ background: '#fff', border: 'none', color: '#000', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}>
          COPY LINK
        </button>
      </div>
    </div>
  );
}
