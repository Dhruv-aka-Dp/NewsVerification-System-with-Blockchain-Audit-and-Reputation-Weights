import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const f = (url) => fetch(`${API}${url}`).then(r => r.json());

// Try to load deploy info for contract addresses
let deployInfo = null;
try { deployInfo = await import('../abis/deploy-info.json'); } catch {}

export default function ExplorerApp() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [subs, setSubs] = useState({ items: [], total: 0 });
  const [votes, setVotes] = useState({ items: [], total: 0 });
  const [decs, setDecs] = useState({ items: [], total: 0 });
  const [snaps, setSnaps] = useState({ items: [], latestEpoch: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    Promise.all([f('/api/blockchain/health'), f('/api/blockchain/stats')])
      .then(([h, s]) => { setHealth(h); setStats(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Auto-refresh stats every 10s
  useEffect(() => {
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  useEffect(() => {
    if (tab === 'submissions') f('/api/blockchain/submissions').then(setSubs).catch(() => {});
    if (tab === 'votes') f('/api/blockchain/votes').then(setVotes).catch(() => {});
    if (tab === 'decisions') f('/api/blockchain/decisions').then(setDecs).catch(() => {});
    if (tab === 'snapshots') f('/api/blockchain/snapshots').then(setSnaps).catch(() => {});
  }, [tab]);

  const truncHash = (h) => h ? `${h.slice(0, 10)}…${h.slice(-8)}` : '—';

  const contracts = deployInfo?.contracts || {};

  return (
    <div className="win-desktop">
      <div className="win-taskbar">
        <div className="win-start-btn">
          <span style={{ fontSize: 14 }}>⛓</span>
          <span>On-Chain Explorer</span>
        </div>
        <div className="win-taskbar-divider" />
        <div className="win-taskbar-items">
          <span className={`win-taskbar-item ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>📊 Overview</span>
          <span className={`win-taskbar-item ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')}>📄 Submissions</span>
          <span className={`win-taskbar-item ${tab === 'votes' ? 'active' : ''}`} onClick={() => setTab('votes')}>🗳 Votes</span>
          <span className={`win-taskbar-item ${tab === 'decisions' ? 'active' : ''}`} onClick={() => setTab('decisions')}>⚖ Decisions</span>
          <span className={`win-taskbar-item ${tab === 'snapshots' ? 'active' : ''}`} onClick={() => setTab('snapshots')}>📸 Snapshots</span>
        </div>
        <button className="win-btn" onClick={toggle} style={{minWidth:'auto',padding:'2px 8px',fontSize:11}}>
          {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
        </button>
        <div className="win-taskbar-clock">Port 5174</div>
      </div>

      <div className="app-container">
        <div className="win-window">
          <div className="win-titlebar">
            <span className="win-titlebar-text">⛓ On-Chain Storage — Blockchain Explorer</span>
          </div>
          <div className="win-content">
            {loading ? <div className="win-loading">⏳ Connecting to blockchain...</div> : (
              <>
                {/* ── OVERVIEW ── */}
                {tab === 'stats' && (
                  <div>
                    <div className="win-group win-mb-8">
                      <span className="win-group-label">Network</span>
                      <table className="win-table"><tbody>
                        <tr><td style={{fontWeight:700}}>Status</td><td>{health?.connected ? <span className="win-text-success">● Connected</span> : <span className="win-text-error">● Disconnected</span>}</td></tr>
                        <tr><td style={{fontWeight:700}}>RPC</td><td className="win-text-mono">{health?.rpcUrl || '—'}</td></tr>
                        <tr><td style={{fontWeight:700}}>Chain ID</td><td>{health?.chainId || '—'}</td></tr>
                        <tr><td style={{fontWeight:700}}>Block Height</td><td>{stats?.blockNumber || 0}</td></tr>
                      </tbody></table>
                    </div>

                    <div className="win-group win-mb-8">
                      <span className="win-group-label">On-Chain Record Counts</span>
                      <div className="win-flex win-gap-8" style={{padding:'8px 0',flexWrap:'wrap'}}>
                        {[
                          { label: 'Submissions', val: stats?.totalSubmissions || 0 },
                          { label: 'Votes', val: stats?.totalVotes || 0 },
                          { label: 'Decisions', val: stats?.totalDecisions || 0 },
                          { label: 'Epochs', val: stats?.latestEpoch || 0 },
                        ].map(c => (
                          <div key={c.label} className="win-group" style={{flex:1,textAlign:'center',minWidth:90}}>
                            <span className="win-group-label">{c.label}</span>
                            <div style={{fontSize:28,fontWeight:900,padding:'8px 0'}}>{c.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {Object.keys(contracts).length > 0 && (
                      <div className="win-group">
                        <span className="win-group-label">Deployed Contracts</span>
                        <table className="win-table"><tbody>
                          {Object.entries(contracts).map(([name, addr]) => (
                            <tr key={name}><td style={{fontWeight:700}}>{name}</td><td className="win-text-mono win-text-small">{addr}</td></tr>
                          ))}
                        </tbody></table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SUBMISSIONS ── */}
                {tab === 'submissions' && (
                  <div>
                    <div className="win-text-small win-mb-4" style={{fontWeight:700}}>On-Chain Submissions ({subs.total})</div>
                    {subs.items.length === 0 ? <div className="win-text-small win-text-muted">No submissions logged on chain yet. Submit news on the main app to see entries here.</div> : (
                      <table className="win-table"><thead><tr><th>#</th><th>Content Hash</th><th>Metadata Hash</th><th>Timestamp</th></tr></thead><tbody>
                        {subs.items.map((s,i)=>(
                          <tr key={i}><td>{s.index}</td><td className="win-text-mono win-text-small">{truncHash(s.contentHash)}</td><td className="win-text-mono win-text-small">{truncHash(s.metadataHash)}</td><td>{new Date(s.timestamp*1000).toLocaleString()}</td></tr>
                        ))}
                      </tbody></table>
                    )}
                  </div>
                )}

                {/* ── VOTES ── */}
                {tab === 'votes' && (
                  <div>
                    <div className="win-text-small win-mb-4" style={{fontWeight:700}}>On-Chain Vote Commitments ({votes.total})</div>
                    <div className="win-text-small win-text-muted win-mb-4">Each vote is stored as an anonymized hash: H = sha256(userId ‖ itemId ‖ direction ‖ confidence ‖ nonce)</div>
                    {votes.items.length === 0 ? <div className="win-text-small win-text-muted">No votes logged on chain yet. Cast votes on the main app to see entries here.</div> : (
                      <table className="win-table"><thead><tr><th>#</th><th>Vote Commitment Hash (V_h)</th></tr></thead><tbody>
                        {votes.items.map((v,i)=>(
                          <tr key={i}><td>{v.index}</td><td className="win-text-mono win-text-small" style={{wordBreak:'break-all'}}>{v.voteHash}</td></tr>
                        ))}
                      </tbody></table>
                    )}
                  </div>
                )}

                {/* ── DECISIONS ── */}
                {tab === 'decisions' && (
                  <div>
                    <div className="win-text-small win-mb-4" style={{fontWeight:700}}>On-Chain Decisions ({decs.total})</div>
                    {decs.items.length === 0 ? <div className="win-text-small win-text-muted">No decisions on chain yet. Items auto-classify when vote thresholds are met.</div> : (
                      <table className="win-table"><thead><tr><th>#</th><th>Content Hash</th><th>Label</th><th>Proof Hash</th><th>Time</th></tr></thead><tbody>
                        {decs.items.map((d,i)=>(
                          <tr key={i}><td>{d.index}</td><td className="win-text-mono win-text-small">{truncHash(d.contentHash)}</td><td>{d.label}</td><td className="win-text-mono win-text-small">{truncHash(d.proofHash)}</td><td>{new Date(d.timestamp*1000).toLocaleString()}</td></tr>
                        ))}
                      </tbody></table>
                    )}
                  </div>
                )}

                {/* ── SNAPSHOTS ── */}
                {tab === 'snapshots' && (
                  <div>
                    <div className="win-text-small win-mb-4" style={{fontWeight:700}}>Reputation State Snapshots (Latest Epoch: {snaps.latestEpoch})</div>
                    <div className="win-text-small win-text-muted win-mb-4">Each epoch commits a hash of the full reputation table, enabling external auditors to verify historical states.</div>
                    {snaps.items.length === 0 ? <div className="win-text-small win-text-muted">No snapshots yet. Snapshots are committed periodically by the cron service.</div> : (
                      <table className="win-table"><thead><tr><th>Epoch</th><th>State Hash</th><th>Timestamp</th></tr></thead><tbody>
                        {snaps.items.map((s,i)=>(
                          <tr key={i}><td>{s.epochNumber}</td><td className="win-text-mono win-text-small">{truncHash(s.stateHash)}</td><td>{new Date(s.timestamp*1000).toLocaleString()}</td></tr>
                        ))}
                      </tbody></table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="win-statusbar">
            <div className="win-statusbar-section">{health?.connected ? '● Connected' : '● Disconnected'}</div>
            <div className="win-statusbar-section" style={{flex:0,minWidth:120}}>Block: {stats?.blockNumber || '—'}</div>
            <div className="win-statusbar-section" style={{flex:0,minWidth:80}}>Auto-refresh</div>
          </div>
        </div>
      </div>
    </div>
  );
}
