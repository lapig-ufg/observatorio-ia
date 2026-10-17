// O texto editorial do Sobre ainda aguarda o autor. A rota equivalente explicita
// a tradução pendente e mantém o retorno, sem inventar respostas para as perguntas.
import { languageUrl } from "./locale";

export function AboutPageEnglish() {
  return <section className="readings-hero" aria-labelledby="about-title">
    <div><p className="eyebrow">UFG-AI Observatory</p><h1 id="about-title">About</h1>
      <p>The English translation of this page is pending editorial review.</p>
      <a href={languageUrl("pt")} lang="pt-BR">Ler a página Sobre em português</a>
    </div>
  </section>;
}
