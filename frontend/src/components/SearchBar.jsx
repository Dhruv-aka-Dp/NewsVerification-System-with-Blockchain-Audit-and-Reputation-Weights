import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (status) params.append('status', status);
    navigate(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="win-flex win-gap-4 win-items-center win-mb-8" style={{ flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Search news items..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="win-input"
        style={{ flex: 1, minWidth: 200 }}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="win-select"
      >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="pending_review">Pending Review</option>
        <option value="classified">Classified</option>
      </select>
      <button type="submit" className="win-btn win-btn-primary">
        🔍 Search
      </button>
    </form>
  );
}
