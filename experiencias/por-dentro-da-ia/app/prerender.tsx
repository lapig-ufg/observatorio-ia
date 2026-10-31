import { renderToString } from "react-dom/server";
import { ClassesHome } from "./home-page";
import { NeuralNetworkPage } from "./neural/NeuralNetworkPage";
import Lesson from "./page";

export function render(page: "home" | "transformers" | "redes-neurais" = "home") {
  const app = page === "transformers" ? <Lesson /> : page === "redes-neurais" ? <NeuralNetworkPage /> : <ClassesHome />;
  return renderToString(app);
}
