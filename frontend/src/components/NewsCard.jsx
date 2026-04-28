import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import CredibilityBadge from './CredibilityBadge';
import SignalBar from './SignalBar';

const STATUS_BADGE = {
  pending: 'win-badge-pending',
  pending_review: 'win-badge-review',
  classified: 'win-badge-true',
  appealed: 'win-badge-uncertain',
};

export default function NewsCard({ item }) {
  const ago = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
    : '';

  return (
    <div className="win-window" style={{ marginBottom: 4 }}>
      <div className="win-titlebar" style={{ cursor: 'pointer' }}>
        <Link to={`/item/${item._id}`} className="win-titlebar-text" style={{ textDecoration: 'none', color: '#fff' }}>
          📄 {item.title}
        </Link>
        <div className="win-titlebar-buttons">
          <span className="win-titlebar-btn">_</span>
          <span className="win-titlebar-btn">□</span>
        </div>
      </div>
      <div className="win-content" style={{ padding: '6px 8px' }}>
        {/* Tags row */}
        <div className="win-flex win-gap-4 win-items-center win-mb-4" style={{ flexWrap: 'wrap' }}>
          <span className="win-badge win-badge-review">{item.section || 'General'}</span>
          <span className="win-badge win-badge-pending">{item.mediaType || 'text'}</span>
          <span className={`win-badge ${STATUS_BADGE[item.status] || 'win-badge-pending'}`}>{item.status}</span>
          {item.classification && <CredibilityBadge classification={item.classification} />}
          {/* Vote count badge */}
          <span className="win-badge" style={{ background: '#0066cc', color: '#fff' }}>
            🗳️ {item.voteCount || 0} votes
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <p className="win-text-small" style={{
            margin: '0 0 4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {item.description}
          </p>
        )}

        {/* Signal bar */}
        <SignalBar T={item.T || 0} F={item.F || 0} U={item.U || 0} />

        {/* Footer — time only (vote count moved to badges) */}
        <div className="win-flex win-justify-between win-items-center" style={{ marginTop: 4 }}>
          <span className="win-text-small win-text-muted">#{item._id?.slice(-4)}</span>
          <span className="win-text-small win-text-muted">{ago}</span>
        </div>
      </div>
    </div>
  );
}
