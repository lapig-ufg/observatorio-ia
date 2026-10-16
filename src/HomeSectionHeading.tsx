import type { ReactNode } from "react";

// Um cabeçalho compartilhado mantém título e ação na mesma linha de base em todas as faixas PT.
export function HomeSectionHeading({ id, eyebrow, title, description, action }: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return <header className="pt-section-heading">
    <p className="pt-section-eyebrow">{eyebrow}</p>
    <h2 id={id}>{title}</h2>
    {action && <div className="pt-section-action">{action}</div>}
    {description && <p className="pt-section-description">{description}</p>}
  </header>;
}
