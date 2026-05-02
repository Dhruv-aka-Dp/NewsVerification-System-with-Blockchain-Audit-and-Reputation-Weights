import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import deployInfo from '../abis/deploy-info.json';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const f = (url) => fetch(`${API}${url}`).then(r => r.json());

function reasonLabel(reason = '') {
  if (reason.includes('reward')) return 'Reward';
  if (reason.includes('penalty')) return 'Penalty';
  if (reason.includes('decay')) return 'Decay';
  if (reason.includes('seed')) return 'Seed';
  if (reason.includes('reset')) return 'Reset';
  return 'Activity';
}

function txLabel(txHash) {
  if (!txHash) return 'Pending/Local';
  return `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;
}

export default function ExplorerApp() {
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [repUpdates, setRepUpdates] = useState({ items: [], total: 0, summary: {} });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    Promise.all([f('/api/blockchain/health'), f('/api/blockchain/stats')])
      .then(([h, s]) => {
        setHealth(h);
        setStats(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadUpdates = useCallback(() => {
    f('/api/blockchain/reputation-updates?limit=25')
      .then(setRepUpdates)
      .catch(() => {});
  }, []);

  useEffect(() => { loadStats(); loadUpdates(); }, [loadStats, loadUpdates]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
      loadUpdates();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadStats, loadUpdates]);

  const contracts = deployInfo?.contracts || {};

  return (
    <div className="win-desktop">
      <div className="win-taskbar">
        <div className="win-start-btn">
          <span style={{ fontSize: 14 }}>⛓</span>
          <span>ERDS Explorer</span>
        </div>
        <div className="win-taskbar-divider" />
        <div className="win-taskbar-items">
          <span className={`win-taskbar-item ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>📊 Overview</span>
          <span className={`win-taskbar-item ${tab === 'reputation-updates' ? 'active' : ''}`} onClick={() => setTab('reputation-updates')}>📝 Reputation Log</span>
        </div>
        <button className="win-btn" onClick={toggle} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: 11 }}>
          {theme === 'win98' ? '🎨 Modern' : '💾 Win98'}
        </button>
        <div className="win-taskbar-clock">Port 5174</div>
      </div>

      <div className="app-container">
        <div className="win-window">
          <div className="win-titlebar">
            <span className="win-titlebar-text">⛓ Explainable Reputation Decay System — Blockchain Explorer</span>
          </div>
          <div className="win-content">
            {loading ? <div className="win-loading">⏳ Connecting to blockchain...</div> : (
              <>
                {tab === 'stats' && (
                  <div>
                    <div className="win-group win-mb-8">
                      <span className="win-group-label">Network</span>
                      <table className="win-table"><tbody>
                        <tr><td style={{ fontWeight: 700 }}>Status</td><td>{health?.connected ? <span className="win-text-success">● Connected</span> : <span className="win-text-error">● Disconnected</span>}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>RPC</td><td className="win-text-mono">{health?.rpcUrl || '—'}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Chain ID</td><td>{health?.chainId || '—'}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Block Height</td><td>{stats?.blockNumber || 0}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Last Tracked Update</td><td>{stats?.latestTrackedUpdateAt ? new Date(stats.latestTrackedUpdateAt).toLocaleString() : '—'}</td></tr>
                      </tbody></table>
                    </div>

                    <div className="win-group win-mb-8">
                      <span className="win-group-label">Reputation Update Counts</span>
                      <div className="win-flex win-gap-8" style={{ padding: '8px 0', flexWrap: 'wrap' }}>
                        {[
                          { label: 'On-Chain Events', val: stats?.totalReputationUpdates || 0 },
                          { label: 'Tracked Updates', val: stats?.totalTrackedUpdates || 0 },
                          { label: 'Recent Rewards', val: repUpdates.summary?.rewards || 0 },
                          { label: 'Recent Activity', val: repUpdates.summary?.activityRefreshes || 0 },
                        ].map(card => (
                          <div key={card.label} className="win-group" style={{ flex: 1, textAlign: 'center', minWidth: 110 }}>
                            <span className="win-group-label">{card.label}</span>
                            <div style={{ fontSize: 28, fontWeight: 900, padding: '8px 0' }}>{card.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="win-group win-mb-8">
                      <span className="win-group-label">Recent Update Mix</span>
                      <table className="win-table"><tbody>
                        <tr><td style={{ fontWeight: 700 }}>Rewards</td><td>{repUpdates.summary?.rewards || 0}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Penalties</td><td>{repUpdates.summary?.penalties || 0}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Decay Adjustments</td><td>{repUpdates.summary?.decayAdjustments || 0}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Activity Refreshes</td><td>{repUpdates.summary?.activityRefreshes || 0}</td></tr>
                        <tr><td style={{ fontWeight: 700 }}>Seed Initializations</td><td>{repUpdates.summary?.initializations || 0}</td></tr>
                      </tbody></table>
                    </div>

                    {Object.keys(contracts).length > 0 && (
                      <div className="win-group">
                        <span className="win-group-label">Deployed Contracts</span>
                        <table className="win-table"><tbody>
                          {Object.entries(contracts).map(([name, addr]) => (
                            <tr key={name}>
                              <td style={{ fontWeight: 700 }}>{name}</td>
                              <td className="win-text-mono win-text-small">{addr}</td>
                            </tr>
                          ))}
                        </tbody></table>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'reputation-updates' && (
                  <div>
                    <div className="win-text-small win-mb-4" style={{ fontWeight: 700 }}>Readable Reputation Update Feed ({repUpdates.total})</div>
                    <div className="win-text-small win-text-muted win-mb-4">
                      Each row shows what changed, why it changed, the effective reputation before and after, and the last interaction timestamp captured with the update.
                    </div>
                    {repUpdates.items.length === 0 ? (
                      <div className="win-text-small win-text-muted">No reputation events tracked yet.</div>
                    ) : (
                      <table className="win-table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Reason</th>
                            <th>Base Δ</th>
                            <th>Effective Before</th>
                            <th>Effective After</th>
                            <th>Item</th>
                            <th>Time</th>
                            <th>Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repUpdates.items.map((event) => (
                            <tr key={event._id}>
                              <td>{event.username}</td>
                              <td><span className="win-badge win-badge-review">{reasonLabel(event.reason)}</span></td>
                              <td style={{ color: event.deltaBaseReputation > 0 ? '#008000' : event.deltaBaseReputation < 0 ? '#c00' : '#444' }}>
                                {event.deltaBaseReputation > 0 ? '+' : ''}{event.deltaBaseReputation.toFixed(2)}
                              </td>
                              <td>{event.oldEffectiveReputation.toFixed(2)}</td>
                              <td>{event.newEffectiveReputation.toFixed(2)}</td>
                              <td className="win-text-small">{event.itemId ? String(event.itemId).slice(-6) : '—'}</td>
                              <td className="win-text-small">{new Date(event.createdAt).toLocaleString()}</td>
                              <td className="win-text-small" title={event.txHash || 'Stored locally until tx hash is available'}>
                                {txLabel(event.txHash)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="win-statusbar">
            <div className="win-statusbar-section">{health?.connected ? '● Connected' : '● Disconnected'}</div>
            <div className="win-statusbar-section" style={{ flex: 0, minWidth: 130 }}>Chain Logs: {stats?.totalReputationUpdates || 0}</div>
            <div className="win-statusbar-section" style={{ flex: 0, minWidth: 130 }}>Tracked: {stats?.totalTrackedUpdates || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
