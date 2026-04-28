import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMyVotes } from '../utils/api';

function getTier(r) {
  if (r >= 70) return { label: 'Trusted', cls: 'win-badge-true', desc: 'High-impact verified contributor' };
  if (r >= 30) return { label: 'Standard', cls: 'win-badge-uncertain', desc: 'Active community member' };
  return { label: 'New', cls: 'win-badge-pending', desc: 'Recently joined — build trust by voting accurately' };
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyVotes().then(v => { setVotes(v); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="win-loading">Loading...</div>;
  const tier = getTier(user.reputation ?? 0);

  return (
    <div>
      <button className="win-btn win-mb-8" onClick={() => navigate(-1)}>← Back</button>
      <div className="win-window win-mb-8">
        <div className="win-titlebar">
          <span className="win-titlebar-text">👤 {user.username}</span>
          <div className="win-titlebar-buttons">
            <span className="win-titlebar-btn" onClick={() => navigate('/')}>✕</span>
          </div>
        </div>
        <div className="win-content">
          <div className="win-group win-mb-8">
            <span className="win-group-label">Account</span>
            <table className="win-table"><tbody>
              <tr><td style={{fontWeight:700}}>Username</td><td>{user.username}</td></tr>
              <tr><td style={{fontWeight:700}}>Email</td><td>{user.email||'—'}</td></tr>
              <tr><td style={{fontWeight:700}}>Verified</td><td>{user.isVerified?<span className="win-text-success">✓ Verified</span>:<span className="win-text-error">⊘ Pending</span>}</td></tr>
              <tr><td style={{fontWeight:700}}>Role</td><td>{user.is_reviewer?'Reviewer':'User'}</td></tr>
            </tbody></table>
          </div>

          {/* Tier — no numeric reputation visible */}
          <div className="win-group win-mb-8">
            <span className="win-group-label">Tier</span>
            <div className="win-flex win-gap-12 win-items-center" style={{padding:'12px 0'}}>
              <span className={`win-badge ${tier.cls}`} style={{fontSize:14,padding:'4px 14px'}}>{tier.label}</span>
              <span className="win-text-small">{tier.desc}</span>
            </div>
          </div>

          <div className="win-group win-mb-8">
            <span className="win-group-label">Activity</span>
            <table className="win-table"><tbody>
              <tr><td style={{fontWeight:700}}>Submissions</td><td>{user.totalSubmissions||0}</td></tr>
              <tr><td style={{fontWeight:700}}>Correct</td><td>{user.correctSubmissions||0}</td></tr>
              <tr><td style={{fontWeight:700}}>Accuracy</td><td>{user.totalSubmissions?(Math.min((user.correctSubmissions||0)/user.totalSubmissions,1)*100).toFixed(0)+'%':'—'}</td></tr>
            </tbody></table>
          </div>

          <div className="win-group">
            <span className="win-group-label">My Votes ({votes.length})</span>
            {loading?<div className="win-loading">⏳</div>:votes.length===0?<div className="win-text-small win-text-muted" style={{padding:8}}>No votes yet.</div>:(
              <table className="win-table"><thead><tr><th>Item</th><th>Dir</th><th>Conf</th></tr></thead><tbody>
                {votes.slice(0,30).map((v,i)=>(<tr key={i} style={{cursor:'pointer'}} onClick={()=>v.itemId?._id&&navigate(`/item/${v.itemId._id}`)}>
                  <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.itemId?.title||'—'}</td>
                  <td>{v.direction===1?'✓':v.direction===-1?'✗':'?'}</td><td>{v.confidence}×</td>
                </tr>))}
              </tbody></table>
            )}
          </div>
          <div className="win-flex win-justify-between win-mt-8">
            <button className="win-btn" onClick={()=>navigate('/')}>🏠 Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}
