const CLASS_MAP = {
  'Verified True': { cls: 'win-badge-true', icon: '✓' },
  'Likely True': { cls: 'win-badge-true', icon: '~' },
  'Uncertain': { cls: 'win-badge-uncertain', icon: '?' },
  'Likely False': { cls: 'win-badge-false', icon: '~' },
  'False': { cls: 'win-badge-false', icon: '✗' },
};

export default function CredibilityBadge({ classification }) {
  if (!classification) return null;
  const c = CLASS_MAP[classification] || { cls: 'win-badge-pending', icon: '' };
  return (
    <span className={`win-badge ${c.cls}`}>
      {c.icon} {classification}
    </span>
  );
}
