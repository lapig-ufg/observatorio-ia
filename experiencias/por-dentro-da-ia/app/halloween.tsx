// Ilustração gerada pelo Imagen (agy), com o fundo removido.
export function HalloweenIcon({ className = "" }: { className?: string }) {
  return (
    <img
      className={`halloween-icon ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}halloween/abobora.png`}
      width={128}
      height={128}
      alt=""
      aria-hidden="true"
    />
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
