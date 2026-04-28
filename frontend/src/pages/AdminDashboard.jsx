import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAdminQueue, getAdminUsers, getPendingUsers, verifyUser, rejectUser, manualClassify } from '../utils/api';

const LABELS = ['Verified True','Likely True','Uncertain','Likely False','False'];
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SAMPLE_SNAPSHOTS = [
  { userId: 'seed001', totalReputation: 85, timestamp: new Date().toISOString(), stage: 'post-vote' },
  { userId: 'user001', totalReputation: 42, timestamp: new Date().toISOString(), stage: 'post-vote' },
  { userId: 'reviewer001', totalReputation: 95, timestamp: new Date().toISOString(), stage: 'post-decision' },
];

const SAMPLE_DECISIONS = [
  { contentHash: '0x abc...', classification: 'Verified True', credibilityScore: 0.87, timestamp: new Date().toISOString() },
  { contentHash: '0x def...', classification: 'Likely True', credibilityScore: 0.72, timestamp: new Date().toISOString() },
  { contentHash: '0x ghi...', classification: 'Uncertain', credibilityScore: 0.45, timestamp: new Date().toISOString() },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [snapshots, setSnapshots] = useState(SAMPLE_SNAPSHOTS);
  const [decisions, setDecisions] = useState(SAMPLE_DECISIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_reviewer) { navigate('/'); return; }
    loadData();
  }, [user, tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'queue') { const d = await getAdminQueue(); setQueue(d.items||[]); }
      else if (tab === 'users') { const d = await getAdminUsers(); setUsers(d.users||[]); }
      else if (tab === 'pending') { const d = await getPendingUsers(); setPending(d.users||[]); }
      else if (tab === 'snapshots') {
        try {
          const d = await fetch(`${API}/api/blockchain/snapshots`).then(r => r.json());
          setSnapshots([...SAMPLE_SNAPSHOTS, ...(d.snapshots || [])]);
        } catch {
          setSnapshots(SAMPLE_SNAPSHOTS);
        }
      }
      else if (tab === 'decisions') {
        try {
          const d = await fetch(`${API}/api/blockchain/decisions`).then(r => r.json());
          setDecisions([...SAMPLE_DECISIONS, ...(d.decisions || [])]);
        } catch {
          setDecisions(SAMPLE_DECISIONS);
        }
      }
    } catch {}
    setLoading(false);
  }

  async function handleVerify(id) { await verifyUser(id,'Admin verified'); loadData(); }
  async function handleReject(id) { await rejectUser(id,'Rejected by admin'); loadData(); }
  async function handleClassify(itemId, label) { await manualClassify(itemId, label); loadData(); }

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>
      <div className="win-window">
        <div className="win-titlebar">
          <span className="win-titlebar-text">⚙️ Admin Dashboard</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="win-tabs" style={{padding:'0 8px'}}>
          <button className={`win-tab ${tab==='queue'?'active':''}`} onClick={()=>setTab('queue')}>📋 Review Queue</button>
          <button className={`win-tab ${tab==='pending'?'active':''}`} onClick={()=>setTab('pending')}>🔒 Pending Users</button>
          <button className={`win-tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>👥 All Users</button>
          <button className={`win-tab ${tab==='snapshots'?'active':''}`} onClick={()=>setTab('snapshots')}>📸 Snapshots</button>
          <button className={`win-tab ${tab==='decisions'?'active':''}`} onClick={()=>setTab('decisions')}>✅ Decisions</button>
        </div>
        <div className="win-tab-content" style={{margin:'0 8px 8px'}}>
          {loading ? <div className="win-loading">⏳ Loading...</div> : (
            <>
              {tab === 'queue' && (
                queue.length === 0 ? <div className="win-text-small win-text-muted" style={{padding:8}}>No items in queue.</div> : (
                  <table className="win-table"><thead><tr><th>Title</th><th>Section</th><th>S</th><th>Action</th></tr></thead><tbody>
                    {queue.map(item => (
                      <tr key={item._id}>
                        <td style={{cursor:'pointer',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onClick={()=>navigate(`/item/${item._id}`)}>{item.title}</td>
                        <td>{item.section}</td>
                        <td>{Math.round(item.S||0)}</td>
                        <td>
                          <select className="win-select" style={{fontSize:11}} onChange={e=>{if(e.target.value)handleClassify(item._id,e.target.value);e.target.value='';}}>
                            <option value="">Classify...</option>
                            {LABELS.map(l=><option key={l} value={l}>{l}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                )
              )}
              {tab === 'pending' && (
                pending.length === 0 ? <div className="win-text-small win-text-muted" style={{padding:8}}>No pending users.</div> : (
                  <table className="win-table"><thead><tr><th>Username</th><th>Email/Wallet</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
                    {pending.map(u => (
                      <tr key={u._id}>
                        <td>{u.username}</td>
                        <td className="win-text-small">{u.email||u.walletAddress||'—'}</td>
                        <td className="win-text-small">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="win-flex win-gap-4">
                            <button className="win-btn" style={{minWidth:60,padding:'2px 8px',fontSize:11}} onClick={()=>handleVerify(u._id)}>✓ Verify</button>
                            <button className="win-btn win-btn-danger" style={{minWidth:60,padding:'2px 8px',fontSize:11}} onClick={()=>handleReject(u._id)}>✗ Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                )
              )}
              {tab === 'users' && (
                <table className="win-table"><thead><tr><th>Username</th><th>Tier</th><th>Verified</th><th>Role</th><th>Submissions</th></tr></thead><tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td><span className={`win-badge ${u.reputation>=70?'win-badge-true':u.reputation>=30?'win-badge-uncertain':'win-badge-pending'}`}>{u.reputation>=70?'Trusted':u.reputation>=30?'Standard':'New'}</span></td>
                      <td>{u.isVerified?'✓':'⊘'}</td>
                      <td>{u.is_reviewer?'Reviewer':u.is_seed?'Seed':'User'}</td>
                      <td>{u.totalSubmissions||0}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
              {tab === 'snapshots' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{fontWeight:700}}>Reputation Snapshots (On-Chain)</div>
                  <table className="win-table"><thead><tr><th>User ID</th><th>Reputation</th><th>Stage</th><th>Timestamp</th></tr></thead><tbody>
                    {snapshots.slice(0, 10).map((snap, i) => (
                      <tr key={i}>
                        <td className="win-text-small">{snap.userId}</td>
                        <td>{snap.totalReputation}</td>
                        <td><span className="win-badge win-badge-review">{snap.stage}</span></td>
                        <td className="win-text-small">{new Date(snap.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
              {tab === 'decisions' && (
                <div>
                  <div className="win-text-small win-mb-4" style={{fontWeight:700}}>Decision Log (On-Chain)</div>
                  <table className="win-table"><thead><tr><th>Content Hash</th><th>Classification</th><th>Credibility</th><th>Timestamp</th></tr></thead><tbody>
                    {decisions.slice(0, 10).map((dec, i) => (
                      <tr key={i}>
                        <td className="win-text-small" title={dec.contentHash}>{dec.contentHash?.slice(0,12)}...</td>
                        <td><span className={`win-badge ${dec.classification==='Verified True'?'win-badge-true':dec.classification==='Likely True'?'win-badge-review':dec.classification==='Uncertain'?'win-badge-uncertain':'win-badge-pending'}`}>{dec.classification}</span></td>
                        <td>{(dec.credibilityScore * 100).toFixed(0)}%</td>
                        <td className="win-text-small">{new Date(dec.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </>
          )}
        </div>
        <div className="win-statusbar">
          <div className="win-statusbar-section">Tab: {tab}</div>
          <div className="win-statusbar-section" style={{flex:0,minWidth:120}}>Admin: {user?.username}</div>
        </div>
      </div>
    </div>
  );
}
