export default function StatsCard({ icon, label, value, trend }) {
  return (
    <div className="win-group" style={{ textAlign: 'center', minWidth: 120 }}>
      <span className="win-group-label">{label}</span>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      {trend != null && (
        <div className="win-text-small" style={{ color: trend > 0 ? '#008000' : '#c00000' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
