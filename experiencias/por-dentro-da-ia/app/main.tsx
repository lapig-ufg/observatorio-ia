import { createRoot, hydrateRoot } from "react-dom/client";
import { ClassesHome } from "./home-page";
import { NeuralNetworkPage } from "./neural/NeuralNetworkPage";
import Lesson from "./page";
import "./globals.css";
import "./story.css";
import "./classes.css";
import "./neural/neural.css";

const root = document.getElementById("root")!;
const page = document.body.dataset.page ?? "home";

const app =
  page === "transformers" ? <Lesson /> : page === "redes-neurais" ? <NeuralNetworkPage /> : <ClassesHome />;

if (root.hasChildNodes() && root.querySelector("main, .site-root")) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
