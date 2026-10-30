export function HalloweenPumpkin({ className = "" }: { className?: string }) {
  return (
    <svg className={`halloween-pumpkin ${className}`.trim()} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 8c-.8-3 1.2-5.2 4.2-6.2" fill="none" stroke="#114d3b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="16" cy="19.5" rx="11" ry="8.8" fill="#d76832" />
      <ellipse cx="10" cy="19.5" rx="5.3" ry="7.8" fill="#e07a3f" />
      <ellipse cx="22" cy="19.5" rx="5.3" ry="7.8" fill="#e07a3f" />
      <path d="M11.4 17.4l3 2.8M20.6 17.4l-3 2.8" fill="none" stroke="#102a43" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 24.2c2.2 1.2 5.8 1.2 8 0" fill="none" stroke="#102a43" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SpiderWeb({ className = "" }: { className?: string }) {
  return (
    <svg className={`halloween-web ${className}`.trim()} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M0 0H100M0 0V100M0 0L100 100M0 0L68 100M0 0L100 68M0 0L100 36M0 0L36 100" />
        <path d="M18 0Q8 8 0 18M36 0Q16 16 0 36M54 0Q26 26 0 54M72 0Q36 36 0 72M90 0Q46 46 0 90" />
      </g>
    </svg>
  );
}

export function HalloweenTag({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`halloween-tag ${compact ? "is-compact" : ""}`.trim()}>
      <HalloweenPumpkin />
      <span>Edição de Halloween</span>
      {!compact && <small>31 de outubro</small>}
    </span>
  );
}
