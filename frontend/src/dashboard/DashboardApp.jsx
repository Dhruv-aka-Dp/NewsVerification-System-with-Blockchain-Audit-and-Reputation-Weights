import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import InfoIcon from '../components/InfoIcon';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const f = (url) => fetch(`${API}${url}`).then(r => r.json());

function getTier(r) {
  if (r >= 70) return { label: 'Trusted', cls: 'win-badge-true' };
  if (r >= 30) return { label: 'Standard', cls: 'win-badge-uncertain' };
  return { label: 'New', cls: 'win-badge-pending' };
}

export default function DashboardApp() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [news, setNews] = useState([]);
  const [newsTotal, setNewsTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newsPage, setNewsPage] = useState(1);

  // Load users
  useEffect(() => {
    f('/api/news/leaderboard?page=1')
      .then(d => { setUsers(d.users || []); setUserTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load news when on documents tab
  useEffect(() => {
    if (tab === 'documents') {
      f(`/api/news?page=${newsPage}`)
        .then(d => { setNews(d.items || []); setNewsTotal(d.total || 0); })
        .catch(() => {});
    }
  }, [tab, newsPage]);

  const sel = selected ? users.find(u => u._id === selected) : null;

  // Stats
  const totalUsers = userTotal;
  const verifiedUsers = users.filter(u => u.isVerified).length;
  const trustedUsers = users.filter(u => u.reputation >= 70).length;

  return (
    <div className="win-desktop">
      <div className="win-taskbar">
        <div className="win-start-btn">
          <span style={{ fontSize: 14 }}>🗄️</span>
          <span>Off-Chain Storage</span>
        </div>
        <div className="win-taskbar-divider" />
        <div className="win-taskbar-items">
          <span className={`win-taskbar-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>📊 Overview</span>
          <span className={`win-taskbar-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 User Activity</span>
          <span className={`win-taskbar-item ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>📄 Documents</span>
        </div>
        <button className="win-btn" onClick={toggle} style={{minWidth:'auto',padding:'2px 8px',fontSize:11}}>
          {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
        </button>
        <div className="win-taskbar-clock">Port 5175</div>
      </div>

      <div className="app-container">
        <div className="win-window">
          <div className="win-titlebar">
            <span className="win-titlebar-text">🗄️ Off-Chain Storage Visualization — MongoDB</span>
          </div>
          <div className="win-content">
            {loading ? <div className="win-loading">⏳ Loading database...</div> : (
              <>
                {/* ── OVERVIEW TAB ── */}
                {tab === 'overview' && (
                  <div>
                    <div className="win-group win-mb-8">
                      <span className="win-group-label">Database Info</span>
                      <table className="win-table"><tbody>
                        <tr><td style={{fontWeight:700}}>Engine</td><td>MongoDB (In-Memory / Atlas)</td></tr>
                        <tr><td style={{fontWeight:700}}>Collections</td><td>users, newsitems, votes, decisions</td></tr>
                        <tr><td style={{fontWeight:700}}>Status</td><td><span className="win-text-success">● Connected</span></td></tr>
                      </tbody></table>
                    </div>

                    <div className="win-group win-mb-8">
                      <span className="win-group-label">Collection Counts</span>
                      <div className="win-flex win-gap-8" style={{padding:'8px 0',flexWrap:'wrap'}}>
                        <div className="win-group" style={{flex:1,textAlign:'center',minWidth:100}}>
                          <span className="win-group-label">Users</span>
                          <div style={{fontSize:28,fontWeight:900,padding:'8px 0'}}>{totalUsers}</div>
                        </div>
                        <div className="win-group" style={{flex:1,textAlign:'center',minWidth:100}}>
                          <span className="win-group-label">News Items</span>
                          <div style={{fontSize:28,fontWeight:900,padding:'8px 0'}}>{newsTotal || '—'}</div>
                        </div>
                        <div className="win-group" style={{flex:1,textAlign:'center',minWidth:100}}>
                          <span className="win-group-label">Verified Users</span>
                          <div style={{fontSize:28,fontWeight:900,padding:'8px 0'}}>{verifiedUsers}</div>
                        </div>
                        <div className="win-group" style={{flex:1,textAlign:'center',minWidth:100}}>
                          <span className="win-group-label">Trusted Tier</span>
                          <div style={{fontSize:28,fontWeight:900,padding:'8px 0'}}>{trustedUsers}</div>
                        </div>
                      </div>
                    </div>

                    <div className="win-group">
                      <span className="win-group-label">Tier Distribution</span>
                      <div style={{padding:'8px 0'}}>
                        {['Trusted', 'Standard', 'New'].map(tier => {
                          const count = users.filter(u => getTier(u.reputation).label === tier).length;
                          const pct = totalUsers > 0 ? (count / totalUsers * 100) : 0;
                          const colors = { Trusted: '#008000', Standard: '#808000', New: '#808080' };
                          return (
                            <div key={tier} className="win-flex win-gap-8 win-items-center" style={{marginBottom:4}}>
                              <span className="win-text-small" style={{width:70,fontWeight:600}}>{tier}</span>
                              <div className="win-progress" style={{flex:1,height:12}}>
                                <div style={{width:`${pct}%`,height:'100%',background:colors[tier],transition:'width 0.3s'}}/>
                              </div>
                              <span className="win-text-small" style={{width:40,textAlign:'right'}}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── USERS TAB ── */}
                {tab === 'users' && (
                  <div>
                    <div className="win-flex win-gap-8" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="win-text-small win-mb-4" style={{fontWeight:700}}>User Activity ({totalUsers} total)</div>
                        <table className="win-table">
                          <thead><tr><th>User</th><th>Tier</th><th>Verified</th><th>Submissions</th><th>Accuracy<InfoIcon variable="accuracy" title="Click to learn about accuracy" /></th></tr></thead>
                          <tbody>
                            {users.map(u => {
                              const tier = getTier(u.reputation);
                              const acc = u.totalSubmissions > 0 ? Math.min((u.correctSubmissions||0) / u.totalSubmissions, 1) * 100 : 0;
                              return (
                                <tr key={u._id} className={selected === u._id ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelected(u._id)}>
                                  <td>{u.username}</td>
                                  <td><span className={`win-badge ${tier.cls}`}>{tier.label}</span></td>
                                  <td>{u.isVerified ? '✓' : '⊘'}</td>
                                  <td>{u.totalSubmissions || 0}</td>
                                  <td>{acc.toFixed(0)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* User detail panel */}
                      {sel && (
                        <div style={{ width: 280 }}>
                          <div className="win-window">
                            <div className="win-titlebar">
                              <span className="win-titlebar-text">👤 {sel.username}</span>
                              <div className="win-titlebar-buttons">
                                <span className="win-titlebar-btn" onClick={() => setSelected(null)}>✕</span>
                              </div>
                            </div>
                            <div className="win-content">
                              <div className="win-flex win-justify-center win-mb-8">
                                <span className={`win-badge ${getTier(sel.reputation).cls}`} style={{fontSize:16,padding:'6px 20px'}}>
                                  {getTier(sel.reputation).label}
                                </span>
                              </div>
                              <table className="win-table">
                                <tbody>
                                  <tr><td style={{fontWeight:700}}>Submissions</td><td>{sel.totalSubmissions || 0}</td></tr>
                                  <tr><td style={{fontWeight:700}}>Correct</td><td>{sel.correctSubmissions || 0}</td></tr>
                                  <tr><td style={{fontWeight:700}}>Accuracy<InfoIcon variable="accuracy" title="Click to learn about accuracy" /></td><td>{sel.totalSubmissions ? (Math.min((sel.correctSubmissions||0) / sel.totalSubmissions, 1) * 100).toFixed(0) + '%' : '—'}</td></tr>
                                  <tr><td style={{fontWeight:700}}>Verified</td><td>{sel.isVerified ? '✓ Yes' : '⊘ No'}</td></tr>
                                  <tr><td style={{fontWeight:700}}>Joined</td><td>{new Date(sel.createdAt).toLocaleDateString()}</td></tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── DOCUMENTS TAB ── */}
                {tab === 'documents' && (
                  <div>
                    <div className="win-text-small win-mb-4" style={{fontWeight:700}}>NewsItem Documents ({newsTotal} total)</div>
                    <table className="win-table">
                      <thead><tr><th>#</th><th>Title</th><th>Section</th><th>Status</th><th>Classification</th><th>Votes<InfoIcon variable="voteCount" title="Click to learn about vote count" /></th></tr></thead>
                      <tbody>
                        {news.map((n, i) => (
                          <tr key={n._id}>
                            <td>{(newsPage-1)*20 + i + 1}</td>
                            <td style={{maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.title}</td>
                            <td>{n.section}</td>
                            <td><span className={`win-badge ${n.status==='classified'?'win-badge-true':n.status==='pending_review'?'win-badge-review':'win-badge-pending'}`}>{n.status}</span></td>
                            <td>{n.classification || '—'}</td>
                            <td>{n.voteCount || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {newsTotal > 20 && (
                      <div className="win-flex win-gap-4 win-justify-center win-mt-8">
                        <button className="win-btn" disabled={newsPage <= 1} onClick={() => setNewsPage(p => p - 1)}>◀ Prev</button>
                        <span className="win-text-small" style={{padding:'4px 8px'}}>Page {newsPage}</span>
                        <button className="win-btn" onClick={() => setNewsPage(p => p + 1)}>Next ▶</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="win-statusbar">
            <div className="win-statusbar-section">● Connected to MongoDB</div>
            <div className="win-statusbar-section" style={{flex:0,minWidth:120}}>Tab: {tab}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
