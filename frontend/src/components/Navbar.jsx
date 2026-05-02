import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useDecay } from '../hooks/useDecay';
import { useState, useEffect } from 'react';
import { demoDecay, demoReset } from '../utils/api';

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
  const { user, switchUser, refreshUser } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [switching, setSwitching] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  
  const decayedRep = useDecay(user);

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

  async function handleDemoAction(action) {
    try {
      if (action === 'decay') await demoDecay(5);
      if (action === 'reset') await demoReset();
      await refreshUser();
    } catch (e) {
      console.error('Demo action failed', e);
    }
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
        {user && (
          <Link to="/profile" className={`win-taskbar-item ${isActive('/profile')}`}>
            👤 Account
          </Link>
        )}
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

      {/* User Info & Demo Controls */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
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

          {/* Reputation Display */}
          <div 
            className="win-inset" 
            style={{ padding: '2px 8px', fontSize: 11, background: '#fff', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowDemo(!showDemo)}
          >
            <span
              style={{ fontWeight: 700, color: decayedRep < 10 ? '#c00' : '#000' }}
              title="Effective reputation after time decay"
            >
              R: {decayedRep.toFixed(2)}
            </span>
            <span>▼</span>
          </div>

          {/* Floating Demo Panel */}
          {showDemo && (
            <div className="win-window" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 1000, minWidth: 200 }}>
              <div className="win-titlebar">
                <span className="win-titlebar-text">ERDS Demo Panel</span>
                <button className="win-titlebar-btn" onClick={() => setShowDemo(false)}>✕</button>
              </div>
              <div className="win-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: 8 }}>
                <button className="win-btn" style={{ textAlign: 'left', fontSize: 11 }} onClick={() => handleDemoAction('decay')}>
                  ⏳ Simulate 5-Day Decay
                </button>
                <button className="win-btn" style={{ textAlign: 'left', fontSize: 11 }} onClick={() => handleDemoAction('reset')}>
                  🔄 Reset Demo State
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="win-taskbar-clock">
        {time}
      </div>
    </div>
  );
}
