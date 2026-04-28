import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitNews } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const SECTIONS = ['National News', 'Local Rajasthan', 'JKLU Campus', 'Tech & Startup', 'Crime & Safety', 'Events'];

export default function Submit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', mediaUrl: '', mediaType: 'text', section: 'JKLU Campus' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      await submitNews(form);
      navigate('/');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>

      <div className="win-window">
        <div className="win-titlebar">
          <span className="win-titlebar-text">📝 Submit News Item</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">
          {user && (
            <div className="win-text-small win-mb-8" style={{ padding: '4px 8px', background: 'rgba(102,126,234,0.1)', borderRadius: 4 }}>
              Submitting as: <b>{user.username}</b>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="win-mb-8">
              <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Title *</label>
              <input className="win-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="News headline..." />
            </div>

            <div className="win-mb-8">
              <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Description</label>
              <textarea className="win-textarea" rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description..." />
            </div>

            <div className="win-flex win-gap-8 win-mb-8" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Section</label>
                <select className="win-select" style={{ width: '100%' }} value={form.section} onChange={e => set('section', e.target.value)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Media Type</label>
                <select className="win-select" style={{ width: '100%' }} value={form.mediaType} onChange={e => set('mediaType', e.target.value)}>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>

            <div className="win-mb-8">
              <label className="win-text-small" style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>Media URL (optional)</label>
              <input className="win-input" value={form.mediaUrl} onChange={e => set('mediaUrl', e.target.value)} placeholder="https://..." />
            </div>

            {error && <div className="win-text-error win-text-small win-mb-8">{error}</div>}

            <div className="win-flex win-gap-4 win-justify-between">
              <button type="button" className="win-btn" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="win-btn win-btn-primary" disabled={loading}>
                {loading ? '⏳ Submitting...' : '📤 Submit News'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
