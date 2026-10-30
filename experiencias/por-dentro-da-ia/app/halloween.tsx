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

const WEB_RAYS = [0, 18, 36, 54, 72, 90];
const WEB_RINGS = [0.22, 0.42, 0.62, 0.82, 1];
const WEB_SIZE = 130;

function webPoint(angle: number, scale: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.cos(radians) * WEB_SIZE * scale,
    y: Math.sin(radians) * WEB_SIZE * scale,
  };
}

export function SpiderWeb({ className = "" }: { className?: string }) {
  const points = WEB_RINGS.map((scale) => WEB_RAYS.map((angle) => webPoint(angle, scale)));
  const radial = WEB_RAYS.map((angle) => {
    const point = webPoint(angle, 1);
    return `M0 0 L${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(" ");
  const rings = points.map((ring) => {
    let path = `M${ring[0].x.toFixed(1)} ${ring[0].y.toFixed(1)}`;
    for (let index = 0; index < ring.length - 1; index += 1) {
      const current = ring[index];
      const next = ring[index + 1];
      const controlX = ((current.x + next.x) / 2) * 0.82;
      const controlY = ((current.y + next.y) / 2) * 0.82;
      path += ` Q${controlX.toFixed(1)} ${controlY.toFixed(1)} ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return path;
  });

  return (
    <svg className={`halloween-web ${className}`.trim()} viewBox={`0 0 ${WEB_SIZE} ${WEB_SIZE}`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <path d={radial} />
        {rings.map((ring, index) => (
          <path key={index} d={ring} />
        ))}
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
