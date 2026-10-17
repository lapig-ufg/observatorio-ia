import { ArrowRight, BookOpen, Building2, ChartNoAxesCombined, ClipboardList, Newspaper } from "lucide-react";
import { trackEvent } from "./analytics";
import { featuredPortalSections, localizedPortalNavigation, portalMetricLabel, type PortalMetric } from "./portalStructure";

const icons = { panorama: ChartNoAxesCombined, levantamentos: ClipboardList, acervo: BookOpen, imprensa: Newspaper, ufg: Building2 };

export function PortalSectionCards({ counts, english = false }: { counts: Partial<Record<PortalMetric, number>>; english?: boolean }) {
  return <div className="pt-task-grid">{featuredPortalSections(localizedPortalNavigation(english)).map(section => {
    const Icon = icons[section.icon as keyof typeof icons] || BookOpen;
    const metric = portalMetricLabel(section.metric, counts, english);
    return <a key={section.href} href={section.href} onClick={() => trackEvent(section.event, { event_category: "navigation", event_label: section.href, position: "hero-card" })}>
      <Icon className="pt-section-icon" size={20} aria-hidden="true" />
      <strong>{section.title}</strong><span className="pt-section-description">{section.description}</span>
      {metric && <span className="pt-section-metric">{metric}</span>}
      <ArrowRight className="pt-section-arrow" size={16} aria-hidden="true" />
    </a>;
  })}</div>;
}
