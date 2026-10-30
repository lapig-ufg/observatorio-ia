export function HalloweenIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`halloween-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 5.9C10.9 4.7 9.5 4.4 8.2 4.9 5.2 6 3.6 8.6 3.6 11.9c0 3.8 3.7 6.5 8.4 6.5s8.4-2.7 8.4-6.5c0-3.3-1.6-5.9-4.6-7-1.3-.5-2.7-.2-3.8 1Z"
        fill="#f4ddcd"
        stroke="#114d3b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 5.6C7.3 7.2 6.5 9.4 6.5 11.9c0 2.6 1 4.8 2.7 6"
        fill="none"
        stroke="#114d3b"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M15.3 5.6c1.4 1.6 2.2 3.8 2.2 6.3 0 2.6-1 4.8-2.7 6"
        fill="none"
        stroke="#114d3b"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12.1 5.9c-.2-1.6.5-2.7 2-3.2"
        fill="none"
        stroke="#114d3b"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M14.2 4.2c1.1-.9 2.6-.9 3.6 0-1.1 1-2.6 1-3.6 0Z" fill="#114d3b" />
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

export function HalloweenKicker({ className = "" }: { className?: string }) {
  return (
    <span className={`halloween-kicker ${className}`.trim()}>
      <HalloweenIcon />
      <span className="halloween-kicker-label">Edição de Halloween</span>
      <span className="halloween-kicker-date">31 de outubro</span>
    </span>
  );
}
