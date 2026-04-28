import { useState } from 'react';
import { useVote } from '../hooks/useVote';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const DIRECTIONS = [
  { value: 1,  label: '✓ True',      cls: 'win-badge-true' },
  { value: 0,  label: '? Uncertain', cls: 'win-badge-uncertain' },
  { value: -1, label: '✗ False',     cls: 'win-badge-false' },
];

const CONFIDENCES = [
  { value: 0.5, label: 'Low (0.5×)' },
  { value: 1.0, label: 'Medium (1.0×)' },
  { value: 1.5, label: 'High (1.5×)' },
];

export default function VotePanel({ item: initialItem, userVote }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { castVote, loading, error, item } = useVote(initialItem._id, initialItem);
  const [dir, setDir] = useState(null);
  const [conf, setConf] = useState(null);
  const [done, setDone] = useState(false);

  const displayItem = item || initialItem;
  const alreadyVoted = !!userVote || done;
  const isClassified = displayItem.status === 'classified';

  const C = displayItem.confidence ?? 0;
  const Ur = displayItem.uncertaintyRatio ?? 1;
  const S = displayItem.S ?? 0;

  async function handleSubmit() {
    if (!user || dir === null || conf === null) return;
    try {
      await castVote(dir, conf);
      setDone(true);
    } catch {}
  }

  if (isClassified) {
    return (
      <div className="win-group">
        <span className="win-group-label">Voting</span>
        <div className="win-text-small win-text-muted" style={{ padding: 8 }}>
          ⊘ This item has been classified — voting is closed.
        </div>
      </div>
    );
  }

  return (
    <div className="win-window">
      <div className="win-titlebar">
        <span className="win-titlebar-text">🗳️ Cast Your Vote</span>
      </div>
      <div className="win-content">
        {/* Live metrics (demo mode) */}
        <div className="win-group win-mb-8">
          <span className="win-group-label">Metrics (Demo)</span>
          <div className="win-flex win-gap-12 win-text-small" style={{ padding: '4px 0' }}>
            <span>C: <b>{C.toFixed(3)}</b></span>
            <span>Uᵣ: <b>{Ur.toFixed(3)}</b></span>
            <span>S: <b>{S.toFixed(2)}</b></span>
          </div>
        </div>

        {alreadyVoted ? (
          <div style={{ padding: 8, background: '#c0ffc0', border: '1px solid #008000', fontSize: 12 }}>
            ✓ Vote recorded
            {userVote && (
              <span className="win-text-muted" style={{ marginLeft: 8 }}>
                ({userVote.direction === 1 ? 'True' : userVote.direction === -1 ? 'False' : 'Uncertain'}, {userVote.confidence}×)
              </span>
            )}
          </div>
        ) : (
          <>
            {/* Direction */}
            <div className="win-mb-8">
              <div className="win-text-small" style={{ fontWeight: 700, marginBottom: 4 }}>DIRECTION</div>
              <div className="win-flex win-gap-4">
                {DIRECTIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDir(d.value)}
                    className={`win-btn ${dir === d.value ? 'win-btn-primary' : ''}`}
                    style={{ flex: 1, fontSize: 12, fontWeight: dir === d.value ? 700 : 400 }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence */}
            <div className="win-mb-8">
              <div className="win-text-small" style={{ fontWeight: 700, marginBottom: 4 }}>CONFIDENCE</div>
              <div className="win-flex win-gap-4">
                {CONFIDENCES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setConf(c.value)}
                    className={`win-btn ${conf === c.value ? 'win-btn-primary' : ''}`}
                    style={{ flex: 1, fontSize: 11, fontWeight: conf === c.value ? 700 : 400 }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="win-text-error win-text-small win-mb-4">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={dir === null || conf === null || loading || !user}
              className="win-btn win-btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Submitting…' : !user ? '🔑 Login to vote' : '✓ Submit Vote'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
