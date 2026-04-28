import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useState, useEffect } from 'react';

const DEMO_USERS = [
  { label: 'dp (Reviewer)', email: 'dp@jklu.edu.in', pass: 'demo123' },
  { label: 'arjun_sharma', email: 'arjun@jklu.edu.in', pass: 'demo123' },
  { label: 'priya_meena', email: 'priya@jklu.edu.in', pass: 'demo123' },
  { label: 'ananya_joshi (Reviewer)', email: 'ananya@jklu.edu.in', pass: 'demo123' },
  { label: 'rahul_verma', email: 'rahul@jklu.edu.in', pass: 'demo123' },
  { label: 'sneha_gupta', email: 'sneha@jklu.edu.in', pass: 'demo123' },
  { label: 'vikram_singh', email: 'vikram@jklu.edu.in', pass: 'demo123' },
  { label: 'amit_desai (Reviewer)', email: 'amit@jklu.edu.in', pass: 'demo123' },
  { label: 'neha_sharma', email: 'neha@jklu.edu.in', pass: 'demo123' },
  { label: 'rohit_kumar', email: 'rohit@jklu.edu.in', pass: 'demo123' },
];

export default function Navbar() {
  const { user, switchUser } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  async function handleSwitch(e) {
    const val = e.target.value;
    if (!val) return;
    const u = DEMO_USERS.find(d => d.email === val);
    if (!u) return;
    setSwitching(true);
    try { await switchUser(u.email, u.pass); } catch {}
    setSwitching(false);
  }

  return (
    <div className="win-taskbar">
      <Link to="/" className="win-start-btn" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 14 }}>📰</span>
        <span>NewsVerify</span>
      </Link>

      <div className="win-taskbar-divider" />

      <div className="win-taskbar-items">
        <Link to="/" className={`win-taskbar-item ${isActive('/')}`}>
          🏠 Home
        </Link>
        <Link to="/submit" className={`win-taskbar-item ${isActive('/submit')}`}>
          📝 Submit
        </Link>
      </div>

      <div className="win-taskbar-divider" />

      <button
        className="win-btn"
        onClick={toggle}
        style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 11 }}
        title={`Switch to ${theme === 'win98' ? 'Modern' : 'Win98'} theme`}
      >
        {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
      </button>

      {/* User Switcher */}
      {user && (
        <select
          className="win-select"
          style={{ fontSize: 11, maxWidth: 140 }}
          value={user.email}
          onChange={handleSwitch}
          disabled={switching}
        >
          {DEMO_USERS.map(d => (
            <option key={d.email} value={d.email}>{d.label}</option>
          ))}
        </select>
      )}

      <div className="win-taskbar-clock">
        {time}
      </div>
    </div>
  );
}
