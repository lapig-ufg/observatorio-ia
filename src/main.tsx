import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppEnglish } from "./AppEnglish";
import { currentLocale } from "./locale";
import "./styles.css";

const locale = currentLocale();
document.documentElement.lang = locale === "en" ? "en" : "pt-BR";
if (locale === "en") document.title = "UFG-AI Observatory | LAPIG/UFG";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {locale === "en" ? <AppEnglish /> : <App />}
  </StrictMode>,
);
