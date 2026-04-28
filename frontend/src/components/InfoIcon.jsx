import { useState } from 'react';

const INFO_TOOLTIPS = {
  voteCount: 'Number of users who have voted on this item',
  T: 'Weighted true votes (sum of weights for True direction votes)',
  F: 'Weighted false votes (sum of weights for False direction votes)',
  U: 'Weighted uncertain votes (sum of weights for Uncertain direction votes)',
  S: 'Total signal (T + F + U) — total weight across all votes',
  C: 'Confidence metric (0-1) — how confident the system is in the classification',
  P: 'Polarity (-1 to 1) — measure of True vs False lean, where 1 is strongly True',
  credibilityScore: 'Final credibility score (0-1) — weighted combination of all factors',
};

export default function InfoIcon({ variable, title }) {
  const [show, setShow] = useState(false);
  const tooltipText = INFO_TOOLTIPS[variable] || 'Information';

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={() => setShow(!show)}
        style={{
          marginLeft: 4,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#0066cc',
          userSelect: 'none',
        }}
        title={title}
      >
        ⓘ
      </span>
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '120%',
            left: '-10px',
            backgroundColor: '#ffffcc',
            border: '1px solid #999',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 11,
            maxWidth: 200,
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
          }}
          onClick={() => setShow(false)}
        >
          {tooltipText}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '10px',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #ffffcc',
            }}
          />
        </div>
      )}
    </span>
  );
}
