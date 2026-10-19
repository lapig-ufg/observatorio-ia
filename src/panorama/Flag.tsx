/* Bandeiras pequenas do Panorama, desenhadas aqui em 30×20 (a mesma caixa do
   FLAG_SVG do Panorama original). São sinais de leitura, não ornamentos: uma
   bandeira por ecossistema e uma por país nas trilhas de "Outros países".
   Simplificadas de propósito — em 18px de largura, o detalhe vira ruído. */

import type { TimelineEcosystem } from "../panoramaTimeline";

export type FlagCode = "US" | "CN" | "WORLD" | "JP" | "FR" | "KR" | "IL" | "IN" | "AE" | "CH" | "ES" | "CA" | "DE" | "GB";

/* Países chegam em português (CREATOR_COUNTRY do Panorama). */
const COUNTRY_FLAG: Record<string, FlagCode> = {
  "Estados Unidos": "US", China: "CN", "Japão": "JP", "França": "FR", "Coreia do Sul": "KR",
  Israel: "IL", "Índia": "IN", "Emirados Árabes": "AE", "Suíça": "CH", Espanha: "ES",
  "Canadá": "CA", Alemanha: "DE", "Reino Unido": "GB",
};

export function countryFlag(country: string): FlagCode | null {
  return COUNTRY_FLAG[country] || null;
}

export function ecosystemFlag(ecosystem: TimelineEcosystem): FlagCode {
  return ecosystem === "ECOSSISTEMA NORTE-AMERICANO" ? "US" : ecosystem === "ECOSSISTEMA CHINÊS" ? "CN" : "WORLD";
}

const star = (cx: number, cy: number, r: number) => Array.from({ length: 10 }, (_, i) => {
  const radius = i % 2 ? r * 0.4 : r;
  const angle = -Math.PI / 2 + i * Math.PI / 5;
  return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/* O desenho em si, em coordenadas 30×20: serve dentro do SVG da régua (<g>)
   e dentro do <svg> de <Flag>. */
export function FlagShapes({ code }: { code: FlagCode }) {
  switch (code) {
    case "US":
      return <>
        <rect width="30" height="20" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map(i => <rect key={i} y={i * 20 / 13} width="30" height={20 / 13} fill="#B22234" />)}
        <rect width="13" height={20 * 7 / 13} fill="#3C3B6E" />
      </>;
    case "CN":
      return <><rect width="30" height="20" fill="#DE2910" /><polygon points={star(5.5, 5, 3)} fill="#FFDE00" />
        {[[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y]) => <polygon key={`${x}${y}`} points={star(x, y, 1)} fill="#FFDE00" />)}</>;
    case "JP":
      return <><rect width="30" height="20" fill="#fff" /><circle cx="15" cy="10" r="6" fill="#BC002D" /></>;
    case "FR":
      return <><rect width="10" height="20" fill="#002395" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ED2939" /></>;
    case "KR":
      return <><rect width="30" height="20" fill="#fff" /><path d="M9 10a6 6 0 0 1 12 0z" fill="#CD2E3A" /><path d="M9 10a6 6 0 0 0 12 0z" fill="#0047A0" />
        <g stroke="#000" strokeWidth="1.2">{[[3, 4], [27, 4], [3, 16], [27, 16]].map(([x, y]) => <line key={`${x}${y}`} x1={x - 1.6} y1={y} x2={x + 1.6} y2={y} />)}</g></>;
    case "IL":
      return <><rect width="30" height="20" fill="#fff" /><rect y="2" width="30" height="2.5" fill="#0038B8" /><rect y="15.5" width="30" height="2.5" fill="#0038B8" />
        <polygon points="15,6 18.5,12 11.5,12" fill="none" stroke="#0038B8" strokeWidth="0.9" /><polygon points="15,14 18.5,8 11.5,8" fill="none" stroke="#0038B8" strokeWidth="0.9" /></>;
    case "IN":
      return <><rect width="30" height="6.67" fill="#FF9933" /><rect y="6.67" width="30" height="6.67" fill="#fff" /><rect y="13.33" width="30" height="6.67" fill="#138808" /><circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth="0.8" /></>;
    case "AE":
      return <><rect width="30" height="6.67" fill="#00732F" /><rect y="6.67" width="30" height="6.67" fill="#fff" /><rect y="13.33" width="30" height="6.67" fill="#000" /><rect width="8" height="20" fill="#FF0000" /></>;
    case "CH":
      return <><rect width="30" height="20" fill="#D52B1E" /><rect x="13" y="4" width="4" height="12" fill="#fff" /><rect x="9" y="8" width="12" height="4" fill="#fff" /></>;
    case "ES":
      return <><rect width="30" height="20" fill="#AA151B" /><rect y="5" width="30" height="10" fill="#F1BF00" /></>;
    case "CA":
      return <><rect width="30" height="20" fill="#fff" /><rect width="7.5" height="20" fill="#D52B1E" /><rect x="22.5" width="7.5" height="20" fill="#D52B1E" /><polygon points={star(15, 10, 4.5)} fill="#D52B1E" /></>;
    case "DE":
      return <><rect width="30" height="6.67" fill="#000" /><rect y="6.67" width="30" height="6.67" fill="#DD0000" /><rect y="13.33" width="30" height="6.67" fill="#FFCE00" /></>;
    case "GB":
      return <><rect width="30" height="20" fill="#012169" /><path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.5" />
        <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" /><path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.5" /></>;
    default:
      /* "Outros países": um globo discreto no lugar de uma bandeira. */
      return <><rect width="30" height="20" fill="#e6f0eb" /><g fill="none" stroke="#1d6650" strokeWidth="1"><circle cx="15" cy="10" r="7" /><ellipse cx="15" cy="10" rx="3" ry="7" /><path d="M8 10h14M9.2 6.5h11.6M9.2 13.5h11.6" /></g></>;
  }
}

/* Moldura comum: cantos de 2px e um filete para o branco não sumir no fundo. */
export function Flag({ code, width = 18, title }: { code: FlagCode; width?: number; title?: string }) {
  return (
    <svg className="panorama-flag" viewBox="0 0 30 20" width={width} height={width * 2 / 3} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title} focusable="false">
      <clipPath id={`flag-clip-${code}`}><rect width="30" height="20" rx="2.5" /></clipPath>
      <g clipPath={`url(#flag-clip-${code})`}><FlagShapes code={code} /></g>
      <rect x="0.4" y="0.4" width="29.2" height="19.2" rx="2.3" fill="none" stroke="rgba(0,0,0,.32)" strokeWidth="1" />
    </svg>
  );
}

/* Versão para dentro do SVG da régua, posicionada em (x, y) com largura w. */
export function FlagInSvg({ code, x, y, w = 21 }: { code: FlagCode; x: number; y: number; w?: number }) {
  const scale = w / 30;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} aria-hidden="true">
      <clipPath id={`flag-svg-clip-${code}`}><rect width="30" height="20" rx="2.5" /></clipPath>
      <g clipPath={`url(#flag-svg-clip-${code})`}><FlagShapes code={code} /></g>
      <rect x="0.4" y="0.4" width="29.2" height="19.2" rx="2.3" fill="none" stroke="rgba(0,0,0,.32)" strokeWidth="1" />
    </g>
  );
}
