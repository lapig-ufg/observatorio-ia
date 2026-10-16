import { ArrowRight, BookOpen, Building2, ChartNoAxesCombined, Newspaper } from "lucide-react";
import { trackEvent } from "./analytics";
import { featuredPortalSections, portalMetricLabel, type PortalMetric } from "./portalStructure";

const icons = { panorama: ChartNoAxesCombined, acervo: BookOpen, imprensa: Newspaper, ufg: Building2 };

export function PortalSectionCards({ counts }: { counts: Partial<Record<PortalMetric, number>> }) {
  return <div className="pt-task-grid">{featuredPortalSections().map(section => {
    const Icon = icons[section.icon as keyof typeof icons] || BookOpen;
    const metric = portalMetricLabel(section.metric, counts);
    return <a key={section.href} href={section.href} onClick={() => trackEvent(section.event, { event_category: "navigation", event_label: section.href, position: "hero-card" })}>
      <Icon className="pt-section-icon" size={20} aria-hidden="true" />
      <strong>{section.title}</strong><span className="pt-section-description">{section.description}</span>
      {metric && <span className="pt-section-metric">{metric}</span>}
      <ArrowRight className="pt-section-arrow" size={16} aria-hidden="true" />
    </a>;
  })}</div>;
}
