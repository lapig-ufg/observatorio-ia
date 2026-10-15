/* Selo da empresa usado em todo o Panorama do Observatório: círculo na cor da
   empresa com o logo SVG branco por cima, na MESMA proporção da pílula do
   Panorama original (assets/render.js: círculo r = iconR, logo em caixa de
   iconR * 1.1 — folga de 10% para o traço não encostar na borda).

   Sem logo cadastrado em LOGO_MAP/LOGO_PATHS, mostra as iniciais
   (`companyInitials`, regra pura testada): DeepSeek → "DS", OpenClaw → "OC",
   senão a primeira letra — nunca uma "bolinha" só com a letra onde o
   original tem vetor. */

import { companyInitials, initialsFontSize } from "../panoramaTimeline";

export function CompanyMark({ company, color, logoPath, size = 22, className = "" }: {
  company: string;
  color: string;
  logoPath: string;
  size?: number;
  className?: string;
}) {
  const initials = companyInitials(company);
  /* O viewBox é o círculo inteiro da pílula (r=11); o logo vive numa caixa de
     12,1 centrada, exatamente como `sz = s.iconR * 1.1` no render.js. */
  const logoBox = 12.1;
  return (
    <svg
      className={`panorama-mark${className ? ` ${className}` : ""}`}
      viewBox="0 0 22 22"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="11" fill={color} />
      {logoPath
        ? <g transform={`translate(${11 - logoBox / 2}, ${11 - logoBox / 2}) scale(${logoBox / 24})`} fill="#fff" dangerouslySetInnerHTML={{ __html: logoPath }} />
        : <text x="11" y="12" textAnchor="middle" dominantBaseline="central" fontSize={initialsFontSize(initials)} fontWeight="800" fill="#fff">{initials}</text>}
    </svg>
  );
}