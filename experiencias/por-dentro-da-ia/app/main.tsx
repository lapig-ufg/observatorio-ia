import { createRoot, hydrateRoot } from "react-dom/client";
import Lesson from "./page";
import "./globals.css";
import "./story.css";

const root = document.getElementById("root")!;
if (root.hasChildNodes() && root.querySelector("main, .site-root")) {
  hydrateRoot(root, <Lesson />);
} else {
  createRoot(root).render(<Lesson />);
}
