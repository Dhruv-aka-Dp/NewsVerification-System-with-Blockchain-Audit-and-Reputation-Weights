export default function SignalBar({ T = 0, F = 0, U = 0 }) {
  const t = Math.round(T);
  const f = Math.round(F);
  const u = Math.round(U);
  const S = t + f + u;
  const pct = (v) => (S > 0 ? ((v / S) * 100).toFixed(1) : 0);

  return (
    <div style={{ marginTop: 4 }}>
      <div className="win-progress" style={{ height: 14 }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {S > 0 ? (
            <>
              <div style={{ width: `${pct(t)}%`, background: '#008000' }} title={`True: ${t}`} />
              <div style={{ width: `${pct(u)}%`, background: '#808000' }} title={`Uncertain: ${u}`} />
              <div style={{ width: `${pct(f)}%`, background: '#c00000' }} title={`False: ${f}`} />
            </>
          ) : (
            <div style={{ width: '100%', background: '#e0e0e0' }} />
          )}
        </div>
      </div>
      <div className="win-flex win-gap-8 win-text-small" style={{ marginTop: 2 }}>
        <span style={{ color: '#008000' }}>True: {t}</span>
        <span style={{ color: '#808000' }}>Uncertain: {u}</span>
        <span style={{ color: '#c00000' }}>False: {f}</span>
        <span className="win-text-muted">Total: {S}</span>
      </div>
    </div>
  );
}
