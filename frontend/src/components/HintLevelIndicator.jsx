const TOTAL = 4;

export function HintLevelIndicator({ level, label, reason }) {
  if (!level) return null;

  return (
    <div className="hintlevel" title={reason}>
      <span className="hintlevel-label">
        Hilfestufe {level}/{TOTAL} — {label}
      </span>
      <span className="hintlevel-bars">
        {Array.from({ length: TOTAL }, (_, i) => (
          <i key={i} className={i < level ? 'on' : ''} />
        ))}
      </span>
    </div>
  );
}