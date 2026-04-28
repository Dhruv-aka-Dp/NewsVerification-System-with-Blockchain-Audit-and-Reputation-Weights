import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getNews } from '../utils/api';
import NewsCard from '../components/NewsCard';
import SearchBar from '../components/SearchBar';
import StatsCard from '../components/StatsCard';

const SECTIONS = ['All', 'National News', 'Local Rajasthan', 'JKLU Campus', 'Tech & Startup', 'Crime & Safety', 'Events'];

export default function Home() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(true);

  const qStatus = searchParams.get('status') || '';
  const qSearch = searchParams.get('q') || '';

  useEffect(() => {
    setLoading(true);
    getNews(page, qStatus, section === 'All' ? '' : section, qSearch)
      .then(data => {
        setItems(prev => page === 1 ? data.items : [...prev, ...data.items]);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, qStatus, section, qSearch]);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [qStatus, section, qSearch]);

  return (
    <div>
      {/* Window frame */}
      <div className="win-window win-mb-8">
        <div className="win-titlebar">
          <span className="win-titlebar-text">📰 NewsVerify — News Verification Platform</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn">_</span>
            <span className="win-titlebar-btn">□</span>
          </div>
        </div>
        <div className="win-content">
          {/* Stats */}
          <div className="win-flex win-gap-8 win-mb-8" style={{ flexWrap: 'wrap' }}>
            <StatsCard icon="📋" label="Total Items" value={total} />
            <StatsCard icon="✓" label="Classified" value={items.filter(i => i.status === 'classified').length} />
            <StatsCard icon="⏳" label="Pending" value={items.filter(i => i.status === 'pending').length} />
            <StatsCard icon="🔍" label="In Review" value={items.filter(i => i.status === 'pending_review').length} />
          </div>

          {/* Search */}
          <SearchBar />

          {/* Section tabs */}
          <div className="win-tabs win-mb-4">
            {SECTIONS.map(s => (
              <button
                key={s}
                className={`win-tab ${(section || 'All') === s ? 'active' : ''}`}
                onClick={() => { setSection(s === 'All' ? '' : s); }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="win-tab-content">
            {loading && items.length === 0 ? (
              <div className="win-loading">⏳ Loading news items...</div>
            ) : items.length === 0 ? (
              <div className="win-loading">No items found.</div>
            ) : (
              <div className="win-flex-col win-gap-4">
                {items.map(item => (
                  <NewsCard key={item._id} item={item} />
                ))}
              </div>
            )}

            {/* Load More */}
            {items.length < total && (
              <div className="win-text-center win-mt-8">
                <button
                  className="win-btn win-btn-primary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                >
                  {loading ? '⏳ Loading...' : '📥 Load More'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="win-statusbar">
          <div className="win-statusbar-section">
            {total} items total
          </div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 140 }}>
            Section: {section || 'All'}
          </div>
          <div className="win-statusbar-section" style={{ flex: 0, minWidth: 100 }}>
            Page {page}
          </div>
        </div>
      </div>
    </div>
  );
}
