import type { Article } from "./catalog";
import { AboutPage } from "./AboutPage";

export function AboutPageEnglish({ articles, loaded }: { articles: Article[]; loaded: boolean }) {
  return <AboutPage articles={articles} loaded={loaded} english />;
}
