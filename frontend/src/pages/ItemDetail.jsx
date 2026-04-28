import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNewsItem, submitEvidence } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import VotePanel from '../components/VotePanel';
import SignalBar from '../components/SignalBar';
import CredibilityBadge from '../components/CredibilityBadge';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceMsg, setEvidenceMsg] = useState('');

  useEffect(() => {
    getNewsItem(id)
      .then(data => { setItem(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleEvidence() {
    if (!evidenceUrl.trim()) return;
    setEvidenceLoading(true);
    setEvidenceMsg('');
    try {
      const updated = await submitEvidence(id, [evidenceUrl.trim()]);
      setItem(updated);
      setEvidenceUrl('');
      setEvidenceMsg('✓ Evidence submitted');
    } catch (e) {
      setEvidenceMsg(e.response?.data?.error || e.message);
    } finally {
      setEvidenceLoading(false);
    }
  }

  if (loading) return <div className="win-loading">⏳ Loading item...</div>;
  if (!item) return <div className="win-loading">Item not found.</div>;

  const C = item.confidence ?? 0;
  const S = item.S ?? 0;
  const U_r = item.uncertaintyRatio ?? 0;
  const thresholds = item.thresholds || { MIN_S: 5, MIN_C: 0.3, MAX_UR: 0.6 };

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>

      <div className="win-window win-mb-8">
        <div className="win-titlebar">
          <span className="win-titlebar-text">📄 {item.title}</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">
          {/* Meta badges */}
          <div className="win-flex win-gap-4 win-items-center win-mb-8" style={{ flexWrap: 'wrap' }}>
            <span className="win-badge win-badge-review">{item.section || 'General'}</span>
            <span className="win-badge win-badge-pending">{item.mediaType || 'text'}</span>
            <span className="win-badge win-badge-pending">{item.status}</span>
            {item.classification && <CredibilityBadge classification={item.classification} />}
          </div>

          {/* Auto-classification status */}
          {item.status === 'classified' && (
            <div style={{ padding: '6px 10px', background: 'rgba(0,128,0,0.08)', border: '1px solid #008000', borderRadius: 4, marginBottom: 8, fontSize: 12 }}>
              ✓ <b>Auto-classified</b> as <b>{item.classification}</b> — Thresholds met: S={Math.round(S)}≥{Math.round(thresholds.MIN_S)}, C={C.toFixed(2)}≥{thresholds.MIN_C}, U_r={U_r.toFixed(2)}≤{thresholds.MAX_UR}
            </div>
          )}
          {item.status === 'pending_review' && (
            <div style={{ padding: '6px 10px', background: 'rgba(128,128,0,0.08)', border: '1px solid #808000', borderRadius: 4, marginBottom: 8, fontSize: 12 }}>
              ⏳ <b>Under review</b> — Awaiting thresholds: S={Math.round(S)} (need ≥{Math.round(thresholds.MIN_S)}), C={C.toFixed(2)} (need ≥{thresholds.MIN_C}), U_r={U_r.toFixed(2)} (need ≤{thresholds.MAX_UR})
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="win-group win-mb-8">
              <span className="win-group-label">Description</span>
              <p style={{ fontSize: 12, lineHeight: 1.5, padding: '4px 0' }}>{item.description}</p>
            </div>
          )}

          {/* Signals */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">Vote Signals ({item.voteCount || 0} total votes)</span>
            <SignalBar T={item.T || 0} F={item.F || 0} U={item.U || 0} />
          </div>

          {/* Evidence submission */}
          {user && item.status !== 'classified' && (
            <div className="win-group win-mb-8">
              <span className="win-group-label">Submit Evidence</span>
              <div className="win-flex win-gap-4 win-items-center" style={{ padding: '4px 0' }}>
                <input
                  type="url"
                  placeholder="https://evidence-url.com/..."
                  value={evidenceUrl}
                  onChange={e => setEvidenceUrl(e.target.value)}
                  className="win-input"
                  style={{ flex: 1 }}
                />
                <button
                  className="win-btn"
                  onClick={handleEvidence}
                  disabled={!evidenceUrl.trim() || evidenceLoading}
                >
                  {evidenceLoading ? '⏳' : '📎 Submit'}
                </button>
              </div>
              {evidenceMsg && (
                <div className={`win-text-small ${evidenceMsg.startsWith('✓') ? 'win-text-success' : 'win-text-error'}`} style={{ marginTop: 4 }}>
                  {evidenceMsg}
                </div>
              )}
            </div>
          )}

          {/* Vote panel */}
          <VotePanel item={item} />
        </div>

        <div className="win-statusbar">
          <div className="win-statusbar-section">ID: {item._id}</div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 120 }}>Status: {item.status}</div>
        </div>
      </div>
    </div>
  );
}
