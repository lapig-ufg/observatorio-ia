import { articles } from "./catalog.generated";
import { Catalog } from "./components/Catalog";

export default function Home() {
  return <Catalog articles={articles} mode="public" />;
}
